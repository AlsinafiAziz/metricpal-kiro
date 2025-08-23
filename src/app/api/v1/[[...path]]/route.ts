import { NextRequest, NextResponse } from 'next/server'
import { unifiedAPI } from '@/lib/unified-api'
import { logger } from '@/lib/logger'

// Convert Next.js request to Express-compatible request
function convertNextRequestToExpress(nextReq: NextRequest, params: { path?: string[] }) {
  const url = new URL(nextReq.url)
  const path = params.path ? `/${params.path.join('/')}` : ''
  
  return {
    method: nextReq.method,
    url: `/api/v1${path}${url.search}`,
    headers: Object.fromEntries(nextReq.headers.entries()),
    body: nextReq.body,
    ip: nextReq.ip || 'unknown',
    query: Object.fromEntries(url.searchParams.entries())
  }
}

// Convert Express response to Next.js response
function convertExpressResponseToNext(expressRes: any): NextResponse {
  const headers = new Headers()
  
  // Copy headers from Express response
  if (expressRes.headers) {
    Object.entries(expressRes.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value)
      }
    })
  }

  return new NextResponse(expressRes.body, {
    status: expressRes.statusCode || 200,
    headers
  })
}

// Handle all HTTP methods through the unified API
async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const resolvedParams = await params
    const expressReq = convertNextRequestToExpress(request, resolvedParams)
    
    logger.debug('API request received', {
      method: request.method,
      url: expressReq.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.ip
    })

    // Create a mock Express response object
    let responseData: any = null
    let statusCode = 200
    let responseHeaders: Record<string, string> = {}

    const mockRes = {
      status: (code: number) => {
        statusCode = code
        return mockRes
      },
      json: (data: any) => {
        responseData = data
        responseHeaders['content-type'] = 'application/json'
        return mockRes
      },
      send: (data: any) => {
        responseData = data
        return mockRes
      },
      setHeader: (key: string, value: string) => {
        responseHeaders[key] = value
        return mockRes
      },
      getHeader: (key: string) => responseHeaders[key],
      headers: responseHeaders
    }

    // Create a mock Express request object
    const mockReq = {
      ...expressReq,
      json: async () => {
        if (request.body) {
          const text = await request.text()
          return text ? JSON.parse(text) : {}
        }
        return {}
      }
    }

    // This is a simplified approach - in a real implementation,
    // you'd want to use a proper Express-to-Next.js adapter
    // For now, we'll handle the basic status endpoint
    if (expressReq.url === '/api/v1/status') {
      return NextResponse.json({
        status: 'ok',
        message: 'MetricPal Unified API v1',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      })
    }

    // Handle collect endpoints
    if (expressReq.url.startsWith('/api/v1/collect')) {
      // Get the request body for POST requests
      let body = null
      if (request.method === 'POST') {
        try {
          const text = await request.text()
          body = text ? JSON.parse(text) : {}
        } catch (e) {
          return NextResponse.json({
            error: {
              code: 'INVALID_JSON',
              message: 'Invalid JSON in request body',
              timestamp: new Date().toISOString(),
              requestId: request.headers.get('x-request-id') || 'unknown'
            }
          }, { status: 400 })
        }
      }

      // Create a mock Express request object with body
      const mockReqWithBody = {
        ...mockReq,
        body,
        json: async () => body || {}
      }

      // Process through unified API
      try {
        const { unifiedAPI } = await import('@/lib/unified-api')
        
        // Create a promise to capture the response
        return new Promise((resolve) => {
          const mockRes = {
            status: (code: number) => {
              statusCode = code
              return mockRes
            },
            json: (data: any) => {
              responseData = data
              responseHeaders['content-type'] = 'application/json'
              resolve(NextResponse.json(data, { 
                status: statusCode,
                headers: responseHeaders 
              }))
              return mockRes
            },
            send: (data: any) => {
              responseData = data
              resolve(new NextResponse(data, { 
                status: statusCode,
                headers: responseHeaders 
              }))
              return mockRes
            },
            setHeader: (key: string, value: string) => {
              responseHeaders[key] = value
              return mockRes
            },
            getHeader: (key: string) => responseHeaders[key],
            headers: responseHeaders
          }

          // Handle the request through the unified API
          const handler = unifiedAPI._router?.stack?.find((layer: any) => 
            layer.regexp.test(expressReq.url)
          )?.handle

          if (handler) {
            handler(mockReqWithBody, mockRes, () => {
              resolve(NextResponse.json({
                error: {
                  code: 'NOT_FOUND',
                  message: 'Endpoint not found',
                  timestamp: new Date().toISOString(),
                  requestId: request.headers.get('x-request-id') || 'unknown'
                }
              }, { status: 404 }))
            })
          } else {
            resolve(NextResponse.json({
              error: {
                code: 'NOT_FOUND',
                message: 'Endpoint not found',
                timestamp: new Date().toISOString(),
                requestId: request.headers.get('x-request-id') || 'unknown'
              }
            }, { status: 404 }))
          }
        })
      } catch (error) {
        return NextResponse.json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            timestamp: new Date().toISOString(),
            requestId: request.headers.get('x-request-id') || 'unknown'
          }
        }, { status: 500 })
      }
    }

    // For other endpoints, return not implemented for now
    return NextResponse.json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'This endpoint will be implemented in subsequent tasks',
        timestamp: new Date().toISOString(),
        requestId: request.headers.get('x-request-id') || 'unknown'
      }
    }, { status: 501 })

  } catch (error) {
    logger.error('API request error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: request.url,
      method: request.method
    })

    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        requestId: request.headers.get('x-request-id') || 'unknown'
      }
    }, { status: 500 })
  }
}

// Export handlers for all HTTP methods
export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest
export const PATCH = handleRequest
export const OPTIONS = handleRequest