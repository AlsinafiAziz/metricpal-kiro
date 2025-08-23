import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as collectPOST } from '../../app/api/v1/collect/route'
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

describe('Tracking Script Integration Tests', () => {
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

  describe('Page View Event Collection', () => {
    it('should collect page view events from tracking script', async () => {
      const pageViewPayload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0',
          isFingerprint: false,
          debugMode: false,
          serverPath: '/optimized',
          serverURL: 'http://localhost:3000/api/v1/collect/optimized'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123',
          identity: null,
          custom: {},
          shared: [],
          sessionData: {
            id: 'session-123',
            startTime: '2025-01-08T12:00:00.000Z',
            referrer: 'https://google.com',
            landingPage: 'https://example.com'
          }
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
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: JSON.stringify(pageViewPayload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed.eventCount).toBe(1)
    })
  })

  describe('Click Event Collection', () => {
    it('should collect click events with element information', async () => {
      const clickPayload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0',
          isFingerprint: false,
          debugMode: false,
          serverPath: '/optimized',
          serverURL: 'http://localhost:3000/api/v1/collect/optimized'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123',
          identity: null,
          custom: {},
          shared: [],
          sessionData: {
            id: 'session-123',
            startTime: '2025-01-08T12:00:00.000Z',
            referrer: 'https://google.com',
            landingPage: 'https://example.com'
          }
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:05.000Z',
            action_type: 'onclick',
            url: 'https://example.com',
            element: 'button.cta-button:nth-of-type(1)',
            text: 'Get Started',
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
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: JSON.stringify(clickPayload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed.eventCount).toBe(1)
    })
  })

  describe('Form Submit Event Collection', () => {
    it('should collect form submission events', async () => {
      const formSubmitPayload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0',
          isFingerprint: false,
          debugMode: false,
          serverPath: '/optimized',
          serverURL: 'http://localhost:3000/api/v1/collect/optimized'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123',
          identity: null,
          custom: {},
          shared: [],
          sessionData: {
            id: 'session-123',
            startTime: '2025-01-08T12:00:00.000Z',
            referrer: 'https://google.com',
            landingPage: 'https://example.com'
          }
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:10.000Z',
            action_type: 'onsubmit',
            url: 'https://example.com',
            element: 'form#contact-form',
            text: null,
            value: '{"name":"John Doe","email":"john@example.com","message":"Hello"}',
            properties: null
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: JSON.stringify(formSubmitPayload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed.eventCount).toBe(1)
    })
  })

  describe('Scroll Depth Event Collection', () => {
    it('should collect scroll depth events', async () => {
      const scrollPayload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0',
          isFingerprint: false,
          debugMode: false,
          serverPath: '/optimized',
          serverURL: 'http://localhost:3000/api/v1/collect/optimized'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123',
          identity: null,
          custom: {},
          shared: [],
          sessionData: {
            id: 'session-123',
            startTime: '2025-01-08T12:00:00.000Z',
            referrer: 'https://google.com',
            landingPage: 'https://example.com'
          }
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:15.000Z',
            action_type: 'scroll-depth',
            url: 'https://example.com',
            element: null,
            text: null,
            value: '75',
            properties: null
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: JSON.stringify(scrollPayload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed.eventCount).toBe(1)
    })
  })

  describe('User Identification Event Collection', () => {
    it('should collect user identification events', async () => {
      const identifyPayload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0',
          isFingerprint: false,
          debugMode: false,
          serverPath: '/optimized',
          serverURL: 'http://localhost:3000/api/v1/collect/optimized'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123',
          identity: 'user@example.com', // In privacy mode, this would be hashed
          custom: {},
          shared: [],
          sessionData: {
            id: 'session-123',
            startTime: '2025-01-08T12:00:00.000Z',
            referrer: 'https://google.com',
            landingPage: 'https://example.com'
          }
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:20.000Z',
            action_type: 'identify',
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
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: JSON.stringify(identifyPayload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed.eventCount).toBe(1)
    })
  })

  describe('Multiple Event Types in Single Request', () => {
    it('should handle multiple event types in one request', async () => {
      const multiEventPayload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0',
          isFingerprint: false,
          debugMode: false,
          serverPath: '/optimized',
          serverURL: 'http://localhost:3000/api/v1/collect/optimized'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123',
          identity: null,
          custom: {},
          shared: [],
          sessionData: {
            id: 'session-123',
            startTime: '2025-01-08T12:00:00.000Z',
            referrer: 'https://google.com',
            landingPage: 'https://example.com'
          }
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
          },
          {
            timestamp: '2025-01-08T12:00:05.000Z',
            action_type: 'onclick',
            url: 'https://example.com',
            element: 'button.cta-button',
            text: 'Get Started',
            value: null,
            properties: null
          },
          {
            timestamp: '2025-01-08T12:00:10.000Z',
            action_type: 'scroll-depth',
            url: 'https://example.com',
            element: null,
            text: null,
            value: '50',
            properties: null
          },
          {
            timestamp: '2025-01-08T12:00:15.000Z',
            action_type: 'onsubmit',
            url: 'https://example.com',
            element: 'form#newsletter',
            text: null,
            value: '{"email":"user@example.com"}',
            properties: null
          }
        ],
        referrer: 'https://google.com'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/collect/optimized', {
        method: 'POST',
        headers: {
          'x-api-key': 'mp_test_1234567890abcdef',
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: JSON.stringify(multiEventPayload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed.eventCount).toBe(4)
    })
  })

  describe('Privacy Mode Integration', () => {
    it('should handle privacy mode with hashed emails', async () => {
      const privacyPayload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0',
          isFingerprint: false,
          debugMode: false,
          serverPath: '/optimized',
          serverURL: 'http://localhost:3000/api/v1/collect/optimized'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123',
          identity: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', // SHA-1 hash of email
          custom: {},
          shared: [],
          sessionData: {
            id: 'session-123',
            startTime: '2025-01-08T12:00:00.000Z',
            referrer: 'https://google.com',
            landingPage: 'https://example.com'
          }
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:00.000Z',
            action_type: 'identify',
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
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: JSON.stringify(privacyPayload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed.eventCount).toBe(1)
    })
  })

  describe('Cookieless Mode Integration', () => {
    it('should handle cookieless mode with fingerprinting', async () => {
      const cookielessPayload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0',
          isFingerprint: true,
          debugMode: false,
          serverPath: '/optimized',
          serverURL: 'http://localhost:3000/api/v1/collect/optimized'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'fingerprint-hash-123456789abcdef',
          screen: {
            availHeight: 1080,
            height: 1080,
            width: 1920,
            depth: 48
          },
          mimeTypes: 'application/pdf,text/html',
          plugins: 'chrome-pdf-viewer,native-client',
          storageEnabled: 'truetruetrue',
          otherInfo: '8false',
          identity: null,
          custom: {},
          shared: [],
          sessionData: {
            id: 'session-123',
            startTime: '2025-01-08T12:00:00.000Z',
            referrer: 'https://google.com',
            landingPage: 'https://example.com'
          }
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
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: JSON.stringify(cookielessPayload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed.eventCount).toBe(1)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle invalid event types gracefully', async () => {
      const invalidEventPayload = {
        customerObject: {
          website: 'example.com',
          apiKey: 'mp_test_1234567890abcdef',
          version: '2.2.0',
          isFingerprint: false,
          debugMode: false,
          serverPath: '/optimized',
          serverURL: 'http://localhost:3000/api/v1/collect/optimized'
        },
        userObject: {
          language: 'en-US',
          platform: 'MacIntel',
          uuid: 'visitor-uuid-123',
          identity: null,
          custom: {},
          shared: [],
          sessionData: {
            id: 'session-123',
            startTime: '2025-01-08T12:00:00.000Z',
            referrer: 'https://google.com',
            landingPage: 'https://example.com'
          }
        },
        actionLog: [
          {
            timestamp: '2025-01-08T12:00:00.000Z',
            action_type: 'invalid-event-type', // Invalid event type
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
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: JSON.stringify(invalidEventPayload)
      })

      const response = await optimizedPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})