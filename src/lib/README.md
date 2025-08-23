# MetricPal Unified API Service

This directory contains the unified API service foundation for MetricPal, implementing the core infrastructure for secure event collection and data processing.

## Task 3 Implementation

This implementation fulfills all requirements for Task 3: "Create unified API service foundation":

### ✅ Express.js API service with TypeScript
- **File**: `api-server.ts` - Core Express.js server with TypeScript configuration
- **File**: `unified-api.ts` - Main API service orchestration
- **Features**: 
  - Full TypeScript support with proper type definitions
  - Modular Express.js application structure
  - JSON request/response handling
  - RESTful API design patterns

### ✅ Supabase client configuration and middleware
- **File**: `supabase-server.ts` - Supabase client configuration (existing)
- **Integration**: API server uses existing Supabase clients for authentication
- **Features**:
  - Service role client for API key validation
  - Row-level security integration
  - Workspace-scoped data access

### ✅ API key validation for tracking script authentication
- **File**: `api-server.ts` - `validateApiKey` middleware function
- **Features**:
  - X-API-Key header validation
  - Workspace lookup and validation
  - Request context enrichment with workspace data
  - Comprehensive error handling and logging
  - Security logging for invalid attempts

### ✅ Basic error handling and logging infrastructure
- **File**: `logger.ts` - Winston-based logging system
- **File**: `api-server.ts` - Error handling middleware and utilities
- **Features**:
  - Structured logging with Winston
  - Request ID tracking for debugging
  - Standardized error response format
  - Security headers with Helmet
  - CORS configuration
  - Rate limiting protection
  - Global error handling middleware

## Architecture

### Core Components

1. **API Server** (`api-server.ts`)
   - Express.js application factory
   - Security middleware (Helmet, CORS, Rate limiting)
   - Authentication middleware (API key and JWT validation)
   - Error handling and logging

2. **Unified API** (`unified-api.ts`)
   - Main API orchestration
   - Route mounting and organization
   - Standalone server capability
   - Next.js integration support

3. **Logger** (`logger.ts`)
   - Winston-based structured logging
   - Environment-specific configuration
   - Request correlation and debugging support

4. **Next.js Integration** (`src/app/api/v1/[[...path]]/route.ts`)
   - Next.js API route handler
   - Express-to-Next.js adapter pattern
   - Unified API integration

### API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/v1/status` - API status and version information
- Future endpoints will be mounted at `/api/v1/*`

### Security Features

- **Helmet**: Security headers protection
- **CORS**: Cross-origin request handling
- **Rate Limiting**: Request throttling (1000 req/15min per IP)
- **API Key Validation**: Workspace-scoped authentication
- **Request ID Tracking**: Correlation IDs for debugging
- **Structured Logging**: Security event logging

### Error Handling

All errors follow a standardized format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { /* optional additional context */ },
    "timestamp": "2025-08-10T14:20:00.000Z",
    "requestId": "req_123456789"
  }
}
```

## Usage

### Development

```bash
# Start Next.js development server (includes API routes)
npm run dev

# Start standalone API server
npm run api-server

# Start standalone API server with auto-reload
npm run api-server:dev
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPatterns=api-server.test.ts
npm test -- --testPathPatterns=api-key-validation.test.ts
npm test -- --testPathPatterns=unified-api-integration.test.ts

# Run tests with coverage
npm run test:coverage
```

### Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for API key validation)

Optional:
- `API_PORT` - Port for standalone server (default: 3001)
- `NODE_ENV` - Environment mode (development/production)

## Next Steps

This foundation is ready for implementing subsequent tasks:

- **Task 4**: Event collection endpoint (`POST /api/v1/collect`)
- **Task 5**: Tracking script integration
- **Task 6**: Tinybird integration for event storage
- **Future tasks**: OAuth endpoints, query processing, etc.

The modular design allows for easy extension and route mounting as new features are added.

## Testing Coverage

- ✅ Express.js server functionality
- ✅ API key validation middleware
- ✅ Error handling and response formatting
- ✅ Security headers and CORS
- ✅ Rate limiting configuration
- ✅ Logging infrastructure
- ✅ Next.js integration
- ✅ Health check endpoints

All tests pass and provide comprehensive coverage of the implemented functionality.