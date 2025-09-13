# MetricPal

AI-Native B2B Analytics Platform that unifies website behavior, ad interactions, and CRM outcomes into a single view of the buyer journey.

## Development Setup

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Supabase account (for managed database and auth)

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Start with Docker (optional):**
   ```bash
   docker-compose up web
   ```

### Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   └── lib/
│       └── supabase.ts      # Supabase client configuration
├── .kiro/
│   └── specs/               # Feature specifications
├── docker-compose.yml       # Local development environment
├── Dockerfile.dev          # Development Docker image
└── Trackingscript.js       # Existing tracking script
```

### Data Flow

See `DATA_FLOW.md` for how events move from the tracking script → API → Tinybird, including auth, validation, forwarding, and query examples.

### Development Environment

The docker-compose.yml includes:
- **web**: Next.js application (port 3000)
- **postgres**: PostgreSQL database (port 5432)
- **redis**: Redis cache (port 6379)
- **api**: Unified API service (port 3001) - *will be implemented in later tasks*
- **mcp-router**: MCP Router service (port 3002) - *will be implemented in later tasks*

### Next Steps

This completes Phase 1 Task 1 of the MetricPal implementation plan. The next tasks will implement:

1. Supabase authentication integration
2. Unified API service foundation
3. Event collection endpoint
4. Website tracking script integration

## Architecture

MetricPal follows a phased development approach:

1. **Phase 1**: Core Infrastructure & Authentication
2. **Phase 2**: Website Tracking Script Integration  
3. **Phase 3**: Data Source Connectors
4. **Phase 4**: Conversational Analytics
5. **Phase 5**: Advanced Analytics Features
6. **Phase 6**: Report Management & Dashboards
7. **Phase 7**: Advanced UI Features
8. **Phase 8**: Operations & Monitoring

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, Supabase
- **Database**: Supabase (PostgreSQL), Tinybird (ClickHouse)
- **Infrastructure**: Docker, Vercel, Google Cloud Run
- **AI/ML**: LLM integration, Model Context Protocol (MCP)