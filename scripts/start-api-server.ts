#!/usr/bin/env tsx

import { config } from 'dotenv'
import { startServer } from '../src/lib/unified-api'
import { logger } from '../src/lib/logger'

// Load environment variables
config({ path: '.env.local' })

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
]

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables', {
    missing: missingEnvVars
  })
  process.exit(1)
}

// Start the server
const port = parseInt(process.env.API_PORT || '3001', 10)

logger.info('Starting MetricPal Unified API server', {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
})

startServer(port)