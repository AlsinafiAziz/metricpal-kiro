import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { createUnifiedAPI } from '../unified-api'
import { Express } from 'express'

describe('Unified API Server', () => {
  let app: Express

  beforeAll(() => {
    app = createUnifiedAPI()
  })

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('API Status', () => {
    it('should return API status', async () => {
      const response = await request(app)
        .get('/api/v1/status')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'ok',
        message: 'MetricPal Unified API v1',
        version: '1.0.0'
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/unknown')
        .expect(404)

      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('not found')
      })
    })

    it('should include request ID in error responses', async () => {
      const response = await request(app)
        .get('/api/v1/unknown')
        .expect(404)

      expect(response.body.error.requestId).toBeDefined()
      expect(response.body.error.timestamp).toBeDefined()
    })
  })

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      // Check for some basic security headers set by helmet
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBeDefined()
    })
  })

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/status')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204)

      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })
  })
})