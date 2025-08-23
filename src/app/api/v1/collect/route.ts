import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, AuthenticatedRequest, createErrorResponse } from '@/lib/api-server'
import { logger } from '@/lib/logger'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

// Function to get CORS headers based on request origin
const getCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'https://metricpal.framer.website',
    'http://localhost:3000',
    'http://localhost:3001',
    // Add more allowed origins as needed
  ]
  
  const allowOrigin = allowedOrigins.includes(origin || '') ? origin : 'https://metricpal.framer.website'
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-request-id',
    'Access-Control-Allow-Credentials': 'true',
  }
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

// Event schema based on tracking script payload structure
const eventSchema = {
  type: 'object',
  required: ['customerObject', 'userObject', 'actionLog'],
  properties: {
    customerObject: {
      type: 'object',
      required: ['website', 'apiKey', 'version'],
      properties: {
        website: { type: 'string', minLength: 1 },
        apiKey: { type: 'string', minLength: 1 },
        isFingerprint: { type: 'boolean' },
        debugMode: { type: 'boolean' },
        serverPath: { type: 'string' },
        serverURL: { type: 'string' },
        version: { type: 'string' }
      },
      additionalProperties: true
    },
    userObject: {
      type: 'object',
      required: ['language', 'platform', 'uuid'],
      properties: {
        language: { type: 'string' },
        platform: { type: 'string' },
        uuid: { type: 'string' },
        screen: {
          type: 'object',
          properties: {
            availHeight: { type: 'number' },
            height: { type: 'number' },
            width: { type: 'number' },
            depth: { type: 'number' }
          },
          additionalProperties: false
        },
        mimeTypes: { type: 'string' },
        plugins: { type: 'string' },
        storageEnabled: { type: 'string' },
        otherInfo: { type: ['string', 'number', 'boolean'] },
        identity: { type: ['string', 'null'] },
        custom: { type: 'object' },
        shared: { type: 'array' },
        sessionData: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            referrer: { type: 'string' },
            landingPage: { type: 'string' }
          },
          additionalProperties: false
        }
      },
      additionalProperties: true
    },
    actionLog: {
      type: 'array',
      items: {
        type: 'object',
        required: ['timestamp', 'action_type', 'url'],
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          action_type: { 
            type: 'string',
            enum: ['enter-page', 'onclick', 'onsubmit', 'onsearch', 'scroll-depth', 'end-session', 'identify', 'custom', 'goal']
          },
          url: { type: 'string' },
          element: { type: ['string', 'null'] },
          text: { type: ['string', 'null'] },
          value: { type: ['string', 'null'] },
          properties: { type: ['object', 'null'] }
        },
        additionalProperties: true
      }
    },
    referrer: { type: 'string' }
  },
  additionalProperties: true
}

const validateEventPayload = ajv.compile(eventSchema)

// Helper function to validate API key
async function validateApiKeyFromHeader(request: NextRequest) {
  // Check for API key in header first, then query parameter
  let apiKey = request.headers.get('x-api-key')
  
  if (!apiKey) {
    const url = new URL(request.url)
    apiKey = url.searchParams.get('api_key')
  }
  
  if (!apiKey) {
    return { error: 'MISSING_API_KEY', message: 'API key is required' }
  }

  try {
    const { createServiceSupabaseClient } = await import('@/lib/supabase-server')
    const supabase = createServiceSupabaseClient()
    
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('id, name, api_key')
      .eq('api_key', apiKey)
      .single()

    if (error || !workspace) {
      return { error: 'INVALID_API_KEY', message: 'Invalid API key provided' }
    }

    return { workspace }
  } catch (error) {
    return { error: 'INTERNAL_ERROR', message: 'Internal server error during authentication' }
  }
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const corsHeaders = getCorsHeaders(request)
  
  try {
    // Validate API key
    const authResult = await validateApiKeyFromHeader(request)
    if (authResult.error) {
      return NextResponse.json(createErrorResponse(
        authResult.error,
        authResult.message,
        requestId
      ), { 
        status: authResult.error === 'MISSING_API_KEY' || authResult.error === 'INVALID_API_KEY' ? 401 : 500,
        headers: corsHeaders
      })
    }

    const workspace = authResult.workspace!

    logger.info('Event collection request received', {
      workspaceId: workspace.id,
      requestId,
      userAgent: request.headers.get('user-agent'),
      contentLength: request.headers.get('content-length'),
      contentType: request.headers.get('content-type')
    })

    // Parse request body
    let body
    try {
      const text = await request.text()
      if (!text.trim()) {
        return NextResponse.json(createErrorResponse(
          'INVALID_PAYLOAD',
          'Request body is empty',
          requestId
        ), { status: 400, headers: corsHeaders })
      }
      body = JSON.parse(text)
    } catch (error) {
      return NextResponse.json(createErrorResponse(
        'INVALID_JSON',
        'Invalid JSON in request body',
        requestId
      ), { status: 400, headers: corsHeaders })
    }

    // Validate request body exists
    if (!body || typeof body !== 'object') {
      return NextResponse.json(createErrorResponse(
        'INVALID_PAYLOAD',
        'Request body must be a valid JSON object',
        requestId
      ), { status: 400, headers: corsHeaders })
    }

    // Validate API key matches payload (if present in payload)
    const payloadApiKey = body.customerObject?.apiKey
    if (payloadApiKey && payloadApiKey !== workspace.api_key) {
      logger.warn('API key mismatch in payload', {
        workspaceId: workspace.id,
        headerApiKey: workspace.api_key.substring(0, 8) + '...',
        payloadApiKey: payloadApiKey.substring(0, 8) + '...',
        requestId
      })
      
      return NextResponse.json(createErrorResponse(
        'API_KEY_MISMATCH',
        'API key in payload does not match authenticated key',
        requestId
      ), { status: 401, headers: corsHeaders })
    }

    // Validate event schema
    const isValid = validateEventPayload(body)
    if (!isValid) {
      const validationErrors = validateEventPayload.errors?.map(error => ({
        field: error.instancePath || error.schemaPath,
        message: error.message,
        value: error.data
      })) || []

      logger.warn('Event payload validation failed', {
        workspaceId: workspace.id,
        errors: validationErrors,
        requestId
      })

      return NextResponse.json(createErrorResponse(
        'VALIDATION_ERROR',
        'Event payload validation failed',
        requestId,
        { validationErrors }
      ), { status: 400, headers: corsHeaders })
    }

    // Extract and validate action log
    const actionLog = body.actionLog || []
    if (actionLog.length === 0) {
      logger.warn('Empty action log received', {
        workspaceId: workspace.id,
        requestId
      })
    }

    // Log events for now (as per task requirements)
    logger.info('Events processed successfully', {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      website: body.customerObject?.website,
      userUuid: body.userObject?.uuid,
      sessionId: body.userObject?.sessionData?.id,
      eventCount: actionLog.length,
      eventTypes: actionLog.map((event: any) => event.action_type),
      referrer: body.referrer,
      requestId
    })

    // Log individual events for debugging
    actionLog.forEach((event: any, index: number) => {
      logger.debug('Event details', {
        workspaceId: workspace.id,
        eventIndex: index,
        timestamp: event.timestamp,
        actionType: event.action_type,
        url: event.url,
        element: event.element,
        text: event.text?.substring(0, 100), // Truncate long text
        value: event.value,
        requestId
      })
    })

    // Forward events to Tinybird for storage
    try {
      const { getTinybirdClient, transformToTinybirdEvents } = await import('@/lib/tinybird')
      const tinybirdClient = getTinybirdClient()
      
      const { events, identities } = transformToTinybirdEvents(workspace.id, body)
      
      // Send events to Tinybird
      if (events.length > 0) {
        await tinybirdClient.sendEvents(events)
      }
      
      // Send user identities to Tinybird
      if (identities.length > 0) {
        await tinybirdClient.sendUserIdentities(identities)
      }
      
      logger.info('Events forwarded to Tinybird successfully', {
        workspaceId: workspace.id,
        eventCount: events.length,
        identityCount: identities.length,
        requestId
      })
      
    } catch (tinybirdError) {
      // Log error but don't fail the request - events are still collected
      logger.error('Failed to forward events to Tinybird', {
        error: tinybirdError instanceof Error ? tinybirdError.message : 'Unknown error',
        workspaceId: workspace.id,
        eventCount: actionLog.length,
        requestId
      })
      
      // Continue processing - don't fail the collection request
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Events collected successfully',
      timestamp: new Date().toISOString(),
      requestId,
      processed: {
        eventCount: actionLog.length,
        workspaceId: workspace.id
      }
    }, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'X-Request-ID': requestId
      }
    })

  } catch (error) {
    logger.error('Event collection error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    })

    return NextResponse.json(createErrorResponse(
      'COLLECTION_ERROR',
      'Failed to process events',
      requestId
    ), { status: 500, headers: corsHeaders })
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request)
  })
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    service: 'event-collection',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }, { headers: getCorsHeaders(request) })
}