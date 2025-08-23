import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { createServiceSupabaseClient } from './supabase-server'
import { logger } from './logger'
import { Database } from './supabase'

// Extend Express Request to include workspace context
export interface AuthenticatedRequest extends Request {
  workspace?: {
    id: string
    name: string
    api_key: string
  }
}

// Error response interface
export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
    timestamp: string
    requestId: string
  }
}

// Create Express app with middleware
export function createAPIServer() {
  const app = express()

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow for development
    crossOriginEmbedderPolicy: false
  }))

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.NEXT_PUBLIC_APP_URL || 'https://metricpal.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }))

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString(),
        requestId: 'rate-limit'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  })
  app.use('/api/', limiter)

  // Request logging
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }))

  // Body parsing
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || 
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    req.headers['x-request-id'] = requestId
    res.setHeader('X-Request-ID', requestId)
    next()
  })

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    })
  })

  return app
}

// API Key validation middleware
export async function validateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
      return res.status(401).json(createErrorResponse(
        'MISSING_API_KEY',
        'API key is required',
        req.headers['x-request-id'] as string
      ))
    }

    const supabase = createServiceSupabaseClient()
    
    // Query workspace by API key
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('id, name, api_key')
      .eq('api_key', apiKey)
      .single()

    if (error || !workspace) {
      logger.warn('Invalid API key attempt', { 
        apiKey: apiKey.substring(0, 8) + '...', 
        ip: req.ip,
        userAgent: req.headers['user-agent']
      })
      
      return res.status(401).json(createErrorResponse(
        'INVALID_API_KEY',
        'Invalid API key provided',
        req.headers['x-request-id'] as string
      ))
    }

    // Attach workspace to request
    req.workspace = workspace
    
    logger.info('API key validated', { 
      workspaceId: workspace.id, 
      workspaceName: workspace.name,
      requestId: req.headers['x-request-id']
    })

    next()
  } catch (error) {
    logger.error('API key validation error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.headers['x-request-id']
    })
    
    return res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      'Internal server error during authentication',
      req.headers['x-request-id'] as string
    ))
  }
}

// Supabase JWT validation middleware (for authenticated user endpoints)
export async function validateSupabaseToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(createErrorResponse(
        'MISSING_AUTH_TOKEN',
        'Authorization header with Bearer token is required',
        req.headers['x-request-id'] as string
      ))
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const supabase = createServiceSupabaseClient()

    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json(createErrorResponse(
        'INVALID_AUTH_TOKEN',
        'Invalid or expired authentication token',
        req.headers['x-request-id'] as string
      ))
    }

    // Get user's workspace
    const { data: workspaceData } = await supabase
      .from('workspace_members')
      .select(`
        role,
        workspaces (
          id,
          name,
          api_key
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (!workspaceData?.workspaces) {
      return res.status(403).json(createErrorResponse(
        'NO_WORKSPACE_ACCESS',
        'User does not have access to any workspace',
        req.headers['x-request-id'] as string
      ))
    }

    // Attach workspace to request
    req.workspace = {
      id: (workspaceData as any).workspaces.id,
      name: (workspaceData as any).workspaces.name,
      api_key: (workspaceData as any).workspaces.api_key
    }

    next()
  } catch (error) {
    logger.error('Token validation error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.headers['x-request-id']
    })
    
    return res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      'Internal server error during authentication',
      req.headers['x-request-id'] as string
    ))
  }
}

// Error response helper
export function createErrorResponse(
  code: string, 
  message: string, 
  requestId: string, 
  details?: Record<string, any>
): ErrorResponse {
  return {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId
    }
  }
}

// Global error handler
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string || 'unknown'
  
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId,
    url: req.url,
    method: req.method
  })

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message

  res.status(500).json(createErrorResponse(
    'INTERNAL_ERROR',
    message,
    requestId,
    process.env.NODE_ENV !== 'production' ? { stack: err.stack } : undefined
  ))
}

// 404 handler
export function notFoundHandler(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string || 'unknown'
  
  res.status(404).json(createErrorResponse(
    'NOT_FOUND',
    `Endpoint ${req.method} ${req.path} not found`,
    requestId
  ))
}