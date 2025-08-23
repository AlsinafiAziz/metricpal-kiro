import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as optimizedPOST } from '../../app/api/v1/collect/optimized/route'

// Mock Supabase
jest.mock('../supabase-server')
const mockCreateServiceSupabaseClient = jest.fn()

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

describe('Event Validation Tests', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }
    
    require('../supabase-server').createServiceSupabaseClient = mockCreateServiceSupabaseClient
    mockCreateServiceSupabaseClient.mockReturnValue(mockSupabase)
  })

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
    api_key: 'mp_test_1234567890abcdef'
  }

  beforeEach(() => {
    mockSupabase.single.mockResolvedValue({ data: mockWorkspace, error: null })
  })

  describe('Event Type Validation', () => {
    const validEventTypes = [
      'enter-page',
      'onclick', 
      'onsubmit',
      'onsearch',
      'scroll-depth',
      'end-session',
      'identify',
      'custom',
      'goal'
    ]

    validEventTypes.forEach(eventType => {
      it(`should accept valid event type: ${eventType}`, async () => {
        const payload = {
          customerObject: {
            website: 'example.com',
            apiKey: 'mp_test_1234567890abcdef',
            version: '2.2.0'
          },
          userObject: {
            language: 'en-US',
            platform: 'MacIntel',
            uuid: 'visitor-uuid-123'
          },
          actionLog: [
            {
              timestamp: '2025-01-08T12:00:00.000Z',
              action_type: eventType,
              url: 'https://example.com',
              element: null,
              text: null,
              value: null,
              properties: null
            }
          ],
          referrer: 'https://google.com'
        }

        const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
          method: 'POST',
          headers: {
            'x-api-key': 'mp_test_1234567890abcdef',
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        const response = await optimizedPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    it('should reject invalid event types', async () => {
      const payload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123'
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:00.000Z',
            action_type: 'invalid-event-type',
            url: 'https://example.com',
            element: null,
            text: null,
            value: null,
            properties: null
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Required Field Validation', () => {
    it('should require timestamp in action log events', async () => {
      const payload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123'
        },
        actionLog: [
          {
            // Missing timestamp
            action_type: 'enter-page',
            url: 'https://example.com',
            element: null,
            text: null,
            value: null,
            properties: null
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should require action_type in action log events', async () => {
      const payload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123'
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:00.000Z',
            // Missing action_type
            url: 'https://example.com',
            element: null,
            text: null,
            value: null,
            properties: null
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should require url in action log events', async () => {
      const payload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123'
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:00.000Z',
            action_type: 'enter-page',
            // Missing url
            element: null,
            text: null,
            value: null,
            properties: null
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Optional Field Validation', () => {
    it('should accept null values for optional fields', async () => {
      const payload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123'
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:00.000Z',
            action_type: 'enter-page',
            url: 'https://example.com',
            element: null,
            text: null,
            value: null,
            properties: null
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should accept string values for optional fields', async () => {
      const payload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123'
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:00.000Z',
            action_type: 'onclick',
            url: 'https://example.com',
            element: 'button.cta-button',
            text: 'Click me',
            value: 'button-value',
            properties: { custom: 'data' }
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Date Format Validation', () => {
    it('should accept valid ISO 8601 timestamps', async () => {
      const validTimestamps = [
        '2025-01-08T12:00:00.000Z',
        '2025-01-08T12:00:00Z',
        '2025-01-08T12:00:00.123Z',
        '2025-01-08T12:00:00+00:00'
      ]

      for (const timestamp of validTimestamps) {
        const payload = {
          customerObject: {
            website: 'example.com',
            apiKey: 'mp_test_1234567890abcdef',
            version: '2.2.0'
          },
          userObject: {
            language: 'en-US',
            platform: 'MacIntel',
            uuid: 'visitor-uuid-123'
          },
          actionLog: [
            {
              timestamp: timestamp,
              action_type: 'enter-page',
              url: 'https://example.com',
              element: null,
              text: null,
              value: null,
              properties: null
            }
          ],
          referrer: 'https://google.com'
        }

        const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
          method: 'POST',
          headers: {
            'x-api-key': 'mp_test_1234567890abcdef',
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        const response = await optimizedPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      }
    })

    it('should reject invalid timestamp formats', async () => {
      const payload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123'
        },
        actionLog: [
          {
            timestamp: 'invalid-timestamp',
            action_type: 'enter-page',
            url: 'https://example.com',
            element: null,
            text: null,
            value: null,
            properties: null
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})