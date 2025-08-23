import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { TinybirdClient, getTinybirdClient, transformToTinybirdEvents } from '../tinybird'

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

describe('TinybirdClient', () => {
  let client: TinybirdClient
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set environment variables for testing
    process.env.TINYBIRD_API_URL = 'https://api.tinybird.co'
    process.env.TINYBIRD_TOKEN = 'test_token'
    
    client = new TinybirdClient()
  })

  describe('constructor', () => {
    it('should throw error if TINYBIRD_TOKEN is not set', () => {
      delete process.env.TINYBIRD_TOKEN
      
      expect(() => new TinybirdClient()).toThrow('TINYBIRD_TOKEN environment variable is required')
    })

    it('should use default API URL if not set', () => {
      delete process.env.TINYBIRD_API_URL
      const client = new TinybirdClient()
      
      expect(client).toBeDefined()
    })
  })

  describe('sendEvents', () => {
    it('should send events to Tinybird successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const events = [
        {
          timestamp: '2025-01-08T10:00:00.000Z',
          workspace_id: 'workspace_123',
          visitor_id: 'visitor_456',
          session_id: 'session_789',
          action_type: 'enter-page',
          url: 'https://example.com',
          user_agent: 'Mozilla/5.0',
          referrer: 'https://google.com'
        }
      ]

      await client.sendEvents(events)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.tinybird.co/v0/events?name=website_events',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test_token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(events)
        }
      )
    })

    it('should handle empty events array', async () => {
      await client.sendEvents([])
      
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should throw error on API failure', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValue('Invalid data')
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const events = [
        {
          timestamp: '2025-01-08T10:00:00.000Z',
          workspace_id: 'workspace_123',
          visitor_id: 'visitor_456',
          session_id: 'session_789',
          action_type: 'enter-page',
          url: 'https://example.com',
          user_agent: 'Mozilla/5.0',
          referrer: 'https://google.com'
        }
      ]

      await expect(client.sendEvents(events)).rejects.toThrow(
        'Tinybird API error: 400 Bad Request - Invalid data'
      )
    })
  })

  describe('sendUserIdentities', () => {
    it('should send user identities to Tinybird successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const identities = [
        {
          workspace_id: 'workspace_123',
          visitor_id: 'visitor_456',
          email_hash: 'hash_123',
          email_domain: 'example.com',
          identified_at: '2025-01-08T10:00:00.000Z'
        }
      ]

      await client.sendUserIdentities(identities)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.tinybird.co/v0/events?name=user_identities',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test_token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(identities)
        }
      )
    })

    it('should handle empty identities array', async () => {
      await client.sendUserIdentities([])
      
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('queryEvents', () => {
    it('should query events from Tinybird pipe', async () => {
      const mockData = {
        data: [
          { date: '2025-01-08', page_views: 100, unique_visitors: 50 }
        ]
      }
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockData)
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const result = await client.queryEvents('page_views', {
        workspace_id: 'workspace_123',
        start_date: '2025-01-01',
        end_date: '2025-01-08'
      })

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.tinybird.co/v0/pipes/page_views.json?workspace_id=workspace_123&start_date=2025-01-01&end_date=2025-01-08',
        {
          headers: {
            'Authorization': 'Bearer test_token',
          }
        }
      )
    })
  })

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const mockResponse = { ok: true }
      mockFetch.mockResolvedValue(mockResponse as any)

      const result = await client.testConnection()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.tinybird.co/v0/datasources',
        {
          headers: {
            'Authorization': 'Bearer test_token',
          }
        }
      )
    })

    it('should return false for failed connection', async () => {
      const mockResponse = { ok: false }
      mockFetch.mockResolvedValue(mockResponse as any)

      const result = await client.testConnection()

      expect(result).toBe(false)
    })

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await client.testConnection()

      expect(result).toBe(false)
    })
  })
})

describe('getTinybirdClient', () => {
  beforeEach(() => {
    process.env.TINYBIRD_TOKEN = 'test_token'
  })

  it('should return singleton instance', () => {
    const client1 = getTinybirdClient()
    const client2 = getTinybirdClient()
    
    expect(client1).toBe(client2)
  })
})

describe('transformToTinybirdEvents', () => {
  it('should transform tracking script payload to Tinybird events', () => {
    const workspaceId = 'workspace_123'
    const payload = {
      userObject: {
        uuid: 'visitor_456',
        platform: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        sessionData: {
          id: 'session_789'
        }
      },
      referrer: 'https://google.com',
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
      ]
    }

    const { events, identities } = transformToTinybirdEvents(workspaceId, payload)

    expect(events).toHaveLength(2)
    expect(identities).toHaveLength(0)

    expect(events[0]).toEqual({
      timestamp: '2025-01-08T10:00:00.000Z',
      workspace_id: 'workspace_123',
      visitor_id: 'visitor_456',
      session_id: 'session_789',
      action_type: 'enter-page',
      url: 'https://example.com',
      element: undefined,
      text: undefined,
      value: undefined,
      properties: undefined,
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      referrer: 'https://google.com'
    })

    expect(events[1]).toEqual({
      timestamp: '2025-01-08T10:01:00.000Z',
      workspace_id: 'workspace_123',
      visitor_id: 'visitor_456',
      session_id: 'session_789',
      action_type: 'onclick',
      url: 'https://example.com',
      element: 'button.cta',
      text: 'Sign Up',
      value: undefined,
      properties: '{"campaign":"homepage"}',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      referrer: 'https://google.com'
    })
  })

  it('should extract user identities from identify events', () => {
    const workspaceId = 'workspace_123'
    const payload = {
      userObject: {
        uuid: 'visitor_456',
        platform: 'Mozilla/5.0',
        sessionData: {
          id: 'session_789'
        }
      },
      referrer: '',
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
      ]
    }

    const { events, identities } = transformToTinybirdEvents(workspaceId, payload)

    expect(events).toHaveLength(1)
    expect(identities).toHaveLength(1)

    expect(identities[0]).toEqual({
      workspace_id: 'workspace_123',
      visitor_id: 'visitor_456',
      email_hash: expect.any(String),
      email_domain: 'example.com',
      identified_at: '2025-01-08T10:00:00.000Z',
      properties: '{"email":"user@example.com","name":"John Doe"}'
    })

    // Check that the event also has email info
    expect(events[0].email_hash).toBeDefined()
    expect(events[0].email_domain).toBe('example.com')
  })

  it('should handle empty action log', () => {
    const workspaceId = 'workspace_123'
    const payload = {
      userObject: {
        uuid: 'visitor_456',
        platform: 'Mozilla/5.0',
        sessionData: {
          id: 'session_789'
        }
      },
      referrer: '',
      actionLog: []
    }

    const { events, identities } = transformToTinybirdEvents(workspaceId, payload)

    expect(events).toHaveLength(0)
    expect(identities).toHaveLength(0)
  })

  it('should handle missing user object data', () => {
    const workspaceId = 'workspace_123'
    const payload = {
      userObject: {},
      referrer: '',
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
      ]
    }

    const { events, identities } = transformToTinybirdEvents(workspaceId, payload)

    expect(events).toHaveLength(1)
    expect(events[0].visitor_id).toBe('unknown')
    expect(events[0].session_id).toBe('unknown')
    expect(events[0].user_agent).toBe('unknown')
  })
})