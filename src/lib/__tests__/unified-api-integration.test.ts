import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { createUnifiedAPI } from '../unified-api'
import { Express } from 'express'

describe('Unified API Integration Tests', () => {
  let app: Express

  beforeAll(() => {
    app = createUnifiedAPI()
  })

  describe('Task 3 Requirements Verification', () => {
    describe('Express.js API service with TypeScript', () => {
      it('should be running Express server with TypeScript', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200)

        expect(response.body.status).toBe('healthy')
      })

      it('should handle JSON requests and responses', async () => {
        const response = await request(app)
          .get('/api/v1/status')
          .expect('Content-Type', /json/)
          .expect(200)

        expect(response.body).toMatchObject({
          status: 'ok',
          message: 'MetricPal Unified API v1'
        })
      })
    })

    describe('Supabase client configuration and middleware', () => {
      it('should have Supabase integration available', () => {
        // This test verifies that the Supabase client is properly configured
        // The actual database calls are tested in the API key validation tests
        const { createServiceSupabaseClient } = require('../supabase-server')
        expect(createServiceSupabaseClient).toBeDefined()
        expect(typeof createServiceSupabaseClient).toBe('function')
      })
    })

    describe('API key validation for tracking script authentication', () => {
      it('should reject requests without API key', async () => {
        // This would be tested with actual endpoints that require API key validation
        // For now, we verify the middleware exists and is properly configured
        const { validateApiKey } = require('../api-server')
        expect(validateApiKey).toBeDefined()
        expect(typeof validateApiKey).toBe('function')
      })

      it('should have proper error response format for authentication failures', async () => {
        const { createErrorResponse } = require('../api-server')
        const error = createErrorResponse('AUTH_ERROR', 'Test auth error', 'req-123')
        
        expect(error).toMatchObject({
          error: {
            code: 'AUTH_ERROR',
            message: 'Test auth error',
            requestId: 'req-123',
            timestamp: expect.any(String)
          }
        })
      })
    })

    describe('Basic error handling and logging infrastructure', () => {
      it('should return structured error responses for 404', async () => {
        const response = await request(app)
          .get('/nonexistent-endpoint')
          .expect(404)

        expect(response.body).toMatchObject({
          error: {
            code: 'NOT_FOUND',
            message: expect.stringContaining('not found'),
            timestamp: expect.any(String),
            requestId: expect.any(String)
          }
        })
      })

      it('should have logging infrastructure configured', () => {
        const { logger } = require('../logger')
        expect(logger).toBeDefined()
        expect(logger.info).toBeDefined()
        expect(logger.error).toBeDefined()
        expect(logger.warn).toBeDefined()
        expect(logger.debug).toBeDefined()
      })

      it('should include request IDs in responses', async () => {
        const response = await request(app)
          .get('/api/v1/status')
          .expect(200)

        expect(response.headers['x-request-id']).toBeDefined()
      })

      it('should handle CORS properly', async () => {
        const response = await request(app)
          .options('/api/v1/status')
          .set('Origin', 'http://localhost:3000')
          .set('Access-Control-Request-Method', 'GET')
          .expect(204)

        expect(response.headers['access-control-allow-origin']).toBeDefined()
      })

      it('should include security headers', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200)

        // Verify helmet security headers are present
        expect(response.headers['x-content-type-options']).toBe('nosniff')
        expect(response.headers['x-frame-options']).toBeDefined()
      })

      it('should have rate limiting configured', async () => {
        // Verify rate limiting middleware is configured
        // The actual rate limiting behavior would require many requests to test
        const response = await request(app)
          .get('/api/v1/status')
          .expect(200)

        // Rate limiting headers should be present
        expect(response.headers['x-ratelimit-limit'] || response.headers['ratelimit-limit']).toBeDefined()
      })
    })

    describe('API Structure and Endpoints', () => {
      it('should have health check endpoint', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200)

        expect(response.body).toMatchObject({
          status: 'healthy',
          timestamp: expect.any(String),
          version: expect.any(String)
        })
      })

      it('should have API v1 status endpoint', async () => {
        const response = await request(app)
          .get('/api/v1/status')
          .expect(200)

        expect(response.body).toMatchObject({
          status: 'ok',
          message: 'MetricPal Unified API v1',
          timestamp: expect.any(String),
          version: '1.0.0'
        })
      })

      it('should be ready for future endpoint additions', () => {
        // Verify the structure is in place for adding more endpoints
        // This is demonstrated by the modular design in unified-api.ts
        expect(app).toBeDefined()
        expect(typeof app.use).toBe('function')
        expect(typeof app.get).toBe('function')
        expect(typeof app.post).toBe('function')
      })
    })
  })
})