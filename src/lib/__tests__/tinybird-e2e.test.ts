import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import { collectRoutes } from '../routes/collect'

// Mock Supabase
jest.mock('../supabase-server', () => ({
  createServiceSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'workspace_123',
              name: 'Test Workspace',
              api_key: 'test_api_key'
            },
            error: null
          })
        }))
      }))
    }))
  }))
}))

// Mock Tinybird to avoid actual API calls
jest.mock('../tinybird', () => {
  const originalModule = jest.requireActual('../tinybird')
  return {
    ...originalModule,
    getTinybirdClient: jest.fn(() => ({
      sendEvents: jest.fn().mockResolvedValue(undefined),
      sendUserIdentities: jest.fn().mockResolvedValue(undefined),
      testConnection: jest.fn().mockResolvedValue(true)
    }))
  }
})

describe('Tinybird Integration E2E', () => {
  let app: express.Application

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up Express app
    app = express()
    app.use(express.json())
    app.use('/api/v1/collect', collectRoutes)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should collect events and process them successfully', async () => {
    const trackingPayload = {
      customerObject: {
        website: 'https://example.com',
        apiKey: 'test_api_key',
        version: '1.0.0'
      },
      userObject: {
        language: 'en-US',
        platform: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        uuid: 'visitor_456',
        sessionData: {
          id: 'session_789',
          startTime: '2025-01-08T10:00:00.000Z',
          referrer: 'https://google.com',
          landingPage: 'https://example.com'
        }
      },
      actionLog: [
        {
          timestamp: '2025-01-08T10:00:00.000Z',
          action_type: 'enter-page',
          url: 'https://example.com',
          element: null,
          text: null,
          value: null,
          properties: null
        },
        {
          timestamp: '2025-01-08T10:01:00.000Z',
          action_type: 'onclick',
          url: 'https://example.com',
          element: 'button.cta',
          text: 'Sign Up',
          value: null,
          properties: { campaign: 'homepage' }
        }
      ],
      referrer: 'https://google.com'
    }

    const response = await request(app)
      .post('/api/v1/collect')
      .set('x-api-key', 'test_api_key')
      .set('Content-Type', 'application/json')
      .send(trackingPayload)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.processed.eventCount).toBe(2)
    expect(response.body.processed.workspaceId).toBe('workspace_123')
    
    // Verify the response structure is correct
    expect(response.body).toHaveProperty('timestamp')
    expect(response.body).toHaveProperty('message')
    expect(response.body.message).toBe('Events collected successfully')
  })

  it('should handle empty action log', async () => {
    const trackingPayload = {
      customerObject: {
        website: 'https://example.com',
        apiKey: 'test_api_key',
        version: '1.0.0'
      },
      userObject: {
        language: 'en-US',
        platform: 'Mozilla/5.0',
        uuid: 'visitor_456',
        sessionData: {
          id: 'session_789',
          startTime: '2025-01-08T10:00:00.000Z',
          referrer: '',
          landingPage: 'https://example.com'
        }
      },
      actionLog: [],
      referrer: ''
    }

    const response = await request(app)
      .post('/api/v1/collect')
      .set('x-api-key', 'test_api_key')
      .set('Content-Type', 'application/json')
      .send(trackingPayload)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.processed.eventCount).toBe(0)
  })

  it('should process identify events', async () => {
    const trackingPayload = {
      customerObject: {
        website: 'https://example.com',
        apiKey: 'test_api_key',
        version: '1.0.0'
      },
      userObject: {
        language: 'en-US',
        platform: 'Mozilla/5.0',
        uuid: 'visitor_456',
        sessionData: {
          id: 'session_789',
          startTime: '2025-01-08T10:00:00.000Z',
          referrer: '',
          landingPage: 'https://example.com'
        }
      },
      actionLog: [
        {
          timestamp: '2025-01-08T10:00:00.000Z',
          action_type: 'identify',
          url: 'https://example.com/signup',
          element: null,
          text: null,
          value: null,
          properties: {
            email: 'user@example.com',
            name: 'John Doe'
          }
        }
      ],
      referrer: ''
    }

    const response = await request(app)
      .post('/api/v1/collect')
      .set('x-api-key', 'test_api_key')
      .set('Content-Type', 'application/json')
      .send(trackingPayload)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.processed.eventCount).toBe(1)
  })

  it('should work with optimized endpoint', async () => {
    const trackingPayload = {
      customerObject: {
        website: 'https://example.com',
        apiKey: 'test_api_key',
        version: '1.0.0'
      },
      userObject: {
        language: 'en-US',
        platform: 'Mozilla/5.0',
        uuid: 'visitor_456',
        sessionData: {
          id: 'session_789',
          startTime: '2025-01-08T10:00:00.000Z',
          referrer: '',
          landingPage: 'https://example.com'
        }
      },
      actionLog: [
        {
          timestamp: '2025-01-08T10:00:00.000Z',
          action_type: 'enter-page',
          url: 'https://example.com',
          element: null,
          text: null,
          value: null,
          properties: null
        }
      ],
      referrer: ''
    }

    const response = await request(app)
      .post('/api/v1/collect/optimized')
      .set('x-api-key', 'test_api_key')
      .set('Content-Type', 'application/json')
      .send(trackingPayload)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.processed.eventCount).toBe(1)
  })
})