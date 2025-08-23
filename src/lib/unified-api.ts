import { createAPIServer, errorHandler, notFoundHandler } from './api-server'
import { logger } from './logger'

// Import route handlers
import { collectRoutes } from './routes/collect'
// import { oauthRoutes } from './routes/oauth'
// import { queryRoutes } from './routes/query'

export function createUnifiedAPI() {
  const app = createAPIServer()

  // API version prefix
  const apiV1 = '/api/v1'

  // Mount route handlers
  app.use(`${apiV1}/collect`, collectRoutes)
  // app.use(`${apiV1}/oauth`, oauthRoutes)
  // app.use(`${apiV1}/query`, queryRoutes)

  // Placeholder routes for now
  app.get(`${apiV1}/status`, (req, res) => {
    res.json({
      status: 'ok',
      message: 'MetricPal Unified API v1',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  })

  // Error handling middleware (must be last)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

// For standalone server usage
export function startServer(port: number = 3001) {
  const app = createUnifiedAPI()
  
  const server = app.listen(port, () => {
    logger.info(`MetricPal Unified API server started on port ${port}`)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully')
    server.close(() => {
      logger.info('Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully')
    server.close(() => {
      logger.info('Server closed')
      process.exit(0)
    })
  })

  return server
}

// Export the app for Next.js API route usage
export const unifiedAPI = createUnifiedAPI()