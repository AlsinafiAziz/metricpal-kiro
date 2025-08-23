import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { validateApiKey, createErrorResponse } from '../api-server'
import { createServiceSupabaseClient } from '../supabase-server'

// Mock Supabase
jest.mock('../supabase-server')
const mockCreateServiceSupabaseClient = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>

describe('API Key Validation', () => {
  let mockReq: any
  let mockRes: any
  let mockNext: jest.MockedFunction<any>
  let mockSupabase: any

  beforeEach(() => {
    mockReq = {
      headers: {
        'x-request-id': 'test-request-id'
      },
      ip: '127.0.0.1'
    }
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
    
    mockNext = jest.fn()
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }
    
    mockCreateServiceSupabaseClient.mockReturnValue(mockSupabase)
  })

  describe('Missing API Key', () => {
    it('should return 401 when API key is missing', async () => {
      await validateApiKey(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'MISSING_API_KEY',
            message: 'API key is required'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Invalid API Key', () => {
    it('should return 401 when API key is invalid', async () => {
      mockReq.headers['x-api-key'] = 'invalid-key'
      mockSupabase.single.mockResolvedValue({ data: null, error: new Error('Not found') })

      await validateApiKey(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_API_KEY',
            message: 'Invalid API key provided'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Valid API Key', () => {
    it('should attach workspace to request and call next', async () => {
      const mockWorkspace = {
        id: 'workspace-123',
        name: 'Test Workspace',
        api_key: 'valid-api-key'
      }

      mockReq.headers['x-api-key'] = 'valid-api-key'
      mockSupabase.single.mockResolvedValue({ data: mockWorkspace, error: null })

      await validateApiKey(mockReq, mockRes, mockNext)

      expect(mockReq.workspace).toEqual(mockWorkspace)
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })
  })

  describe('Database Error', () => {
    it('should return 500 when database query fails', async () => {
      mockReq.headers['x-api-key'] = 'some-key'
      mockSupabase.single.mockRejectedValue(new Error('Database connection failed'))

      await validateApiKey(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Internal server error during authentication'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})

describe('Error Response Helper', () => {
  it('should create properly formatted error response', () => {
    const error = createErrorResponse(
      'TEST_ERROR',
      'Test error message',
      'test-request-id',
      { detail: 'test detail' }
    )

    expect(error).toMatchObject({
      error: {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: { detail: 'test detail' },
        timestamp: expect.any(String),
        requestId: 'test-request-id'
      }
    })
  })

  it('should create error response without details', () => {
    const error = createErrorResponse(
      'SIMPLE_ERROR',
      'Simple error',
      'req-123'
    )

    expect(error).toMatchObject({
      error: {
        code: 'SIMPLE_ERROR',
        message: 'Simple error',
        timestamp: expect.any(String),
        requestId: 'req-123'
      }
    })
    expect(error.error.details).toBeUndefined()
  })
})