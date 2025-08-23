import { Router, Request, Response } from 'express'
import { validateApiKey, AuthenticatedRequest, createErrorResponse } from '../api-server'
import { logger } from '../logger'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const router = Router()
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

// POST /api/v1/collect - Main event collection endpoint
router.post('/', validateApiKey, async (req: AuthenticatedRequest, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  
  try {
    logger.info('Event collection request received', {
      workspaceId: req.workspace?.id,
      requestId,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
      contentType: req.headers['content-type']
    })

    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json(createErrorResponse(
        'INVALID_PAYLOAD',
        'Request body must be a valid JSON object',
        requestId
      ))
    }

    // Validate API key matches payload (if present in payload)
    const payloadApiKey = req.body.customerObject?.apiKey
    if (payloadApiKey && payloadApiKey !== req.workspace?.api_key) {
      logger.warn('API key mismatch in payload', {
        workspaceId: req.workspace?.id,
        headerApiKey: req.workspace?.api_key?.substring(0, 8) + '...',
        payloadApiKey: payloadApiKey?.substring(0, 8) + '...',
        requestId
      })
      
      return res.status(401).json(createErrorResponse(
        'API_KEY_MISMATCH',
        'API key in payload does not match authenticated key',
        requestId
      ))
    }

    // Validate event schema
    const isValid = validateEventPayload(req.body)
    if (!isValid) {
      const validationErrors = validateEventPayload.errors?.map(error => ({
        field: error.instancePath || error.schemaPath,
        message: error.message,
        value: error.data
      })) || []

      logger.warn('Event payload validation failed', {
        workspaceId: req.workspace?.id,
        errors: validationErrors,
        requestId
      })

      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        'Event payload validation failed',
        requestId,
        { validationErrors }
      ))
    }

    // Extract and validate action log
    const actionLog = req.body.actionLog || []
    if (actionLog.length === 0) {
      logger.warn('Empty action log received', {
        workspaceId: req.workspace?.id,
        requestId
      })
    }

    // Log events for now (as per task requirements)
    logger.info('Events processed successfully', {
      workspaceId: req.workspace?.id,
      workspaceName: req.workspace?.name,
      website: req.body.customerObject?.website,
      userUuid: req.body.userObject?.uuid,
      sessionId: req.body.userObject?.sessionData?.id,
      eventCount: actionLog.length,
      eventTypes: actionLog.map((event: any) => event.action_type),
      referrer: req.body.referrer,
      requestId
    })

    // Log individual events for debugging
    actionLog.forEach((event: any, index: number) => {
      logger.debug('Event details', {
        workspaceId: req.workspace?.id,
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
      const { getTinybirdClient, transformToTinybirdEvents } = await import('../tinybird')
      const tinybirdClient = getTinybirdClient()
      
      const { events, identities } = transformToTinybirdEvents(req.workspace!.id, req.body)
      
      // Send events to Tinybird
      if (events.length > 0) {
        await tinybirdClient.sendEvents(events)
      }
      
      // Send user identities to Tinybird
      if (identities.length > 0) {
        await tinybirdClient.sendUserIdentities(identities)
      }
      
      logger.info('Events forwarded to Tinybird successfully', {
        workspaceId: req.workspace!.id,
        eventCount: events.length,
        identityCount: identities.length,
        requestId
      })
      
    } catch (tinybirdError) {
      // Log error but don't fail the request - events are still collected
      logger.error('Failed to forward events to Tinybird', {
        error: tinybirdError instanceof Error ? tinybirdError.message : 'Unknown error',
        workspaceId: req.workspace!.id,
        eventCount: actionLog.length,
        requestId
      })
      
      // Continue processing - don't fail the collection request
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Events collected successfully',
      timestamp: new Date().toISOString(),
      requestId,
      processed: {
        eventCount: actionLog.length,
        workspaceId: req.workspace?.id
      }
    })

  } catch (error) {
    logger.error('Event collection error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      workspaceId: req.workspace?.id,
      requestId
    })

    return res.status(500).json(createErrorResponse(
      'COLLECTION_ERROR',
      'Failed to process events',
      requestId
    ))
  }
})

// POST /api/v1/collect/optimized - Alternative endpoint for optimized tracking script
router.post('/optimized', validateApiKey, async (req: AuthenticatedRequest, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  
  try {
    logger.info('Optimized event collection request received', {
      workspaceId: req.workspace?.id,
      requestId,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
      contentType: req.headers['content-type']
    })

    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json(createErrorResponse(
        'INVALID_PAYLOAD',
        'Request body must be a valid JSON object',
        requestId
      ))
    }

    // Validate API key matches payload (if present in payload)
    const payloadApiKey = req.body.customerObject?.apiKey
    if (payloadApiKey && payloadApiKey !== req.workspace?.api_key) {
      logger.warn('API key mismatch in payload', {
        workspaceId: req.workspace?.id,
        headerApiKey: req.workspace?.api_key?.substring(0, 8) + '...',
        payloadApiKey: payloadApiKey?.substring(0, 8) + '...',
        requestId
      })
      
      return res.status(401).json(createErrorResponse(
        'API_KEY_MISMATCH',
        'API key in payload does not match authenticated key',
        requestId
      ))
    }

    // Validate event schema
    const isValid = validateEventPayload(req.body)
    if (!isValid) {
      const validationErrors = validateEventPayload.errors?.map(error => ({
        field: error.instancePath || error.schemaPath,
        message: error.message,
        value: error.data
      })) || []

      logger.warn('Event payload validation failed', {
        workspaceId: req.workspace?.id,
        errors: validationErrors,
        requestId
      })

      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        'Event payload validation failed',
        requestId,
        { validationErrors }
      ))
    }

    // Extract and validate action log
    const actionLog = req.body.actionLog || []
    if (actionLog.length === 0) {
      logger.warn('Empty action log received', {
        workspaceId: req.workspace?.id,
        requestId
      })
    }

    // Log events for now (as per task requirements)
    logger.info('Optimized events processed successfully', {
      workspaceId: req.workspace?.id,
      workspaceName: req.workspace?.name,
      website: req.body.customerObject?.website,
      userUuid: req.body.userObject?.uuid,
      sessionId: req.body.userObject?.sessionData?.id,
      eventCount: actionLog.length,
      eventTypes: actionLog.map((event: any) => event.action_type),
      referrer: req.body.referrer,
      requestId
    })

    // Log individual events for debugging
    actionLog.forEach((event: any, index: number) => {
      logger.debug('Optimized event details', {
        workspaceId: req.workspace?.id,
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
      const { getTinybirdClient, transformToTinybirdEvents } = await import('../tinybird')
      const tinybirdClient = getTinybirdClient()
      
      const { events, identities } = transformToTinybirdEvents(req.workspace!.id, req.body)
      
      // Send events to Tinybird
      if (events.length > 0) {
        await tinybirdClient.sendEvents(events)
      }
      
      // Send user identities to Tinybird
      if (identities.length > 0) {
        await tinybirdClient.sendUserIdentities(identities)
      }
      
      logger.info('Optimized events forwarded to Tinybird successfully', {
        workspaceId: req.workspace!.id,
        eventCount: events.length,
        identityCount: identities.length,
        requestId
      })
      
    } catch (tinybirdError) {
      // Log error but don't fail the request - events are still collected
      logger.error('Failed to forward optimized events to Tinybird', {
        error: tinybirdError instanceof Error ? tinybirdError.message : 'Unknown error',
        workspaceId: req.workspace!.id,
        eventCount: actionLog.length,
        requestId
      })
      
      // Continue processing - don't fail the collection request
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Events collected successfully',
      timestamp: new Date().toISOString(),
      requestId,
      processed: {
        eventCount: actionLog.length,
        workspaceId: req.workspace?.id
      }
    })

  } catch (error) {
    logger.error('Optimized event collection error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      workspaceId: req.workspace?.id,
      requestId
    })

    return res.status(500).json(createErrorResponse(
      'COLLECTION_ERROR',
      'Failed to process events',
      requestId
    ))
  }
})

// GET /api/v1/collect/health - Health check for collection service
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'event-collection',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

export { router as collectRoutes }