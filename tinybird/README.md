# Tinybird Integration

This directory contains the Tinybird configuration for MetricPal's event storage and analytics.

## Overview

Tinybird is used as the primary analytics data store for MetricPal, providing:
- High-performance event ingestion
- Real-time analytics queries
- Automatic HTTP endpoint generation
- Built-in query optimization and caching

## Setup

### Prerequisites

1. **Tinybird Account**: Sign up at [tinybird.co](https://tinybird.co)
2. **Tinybird CLI**: Install the CLI tool
   ```bash
   pip install tinybird-cli
   ```

### Configuration

1. **Get your Tinybird token** from the Tinybird UI (Admin > Tokens)

2. **Set environment variables**:
   ```bash
   export TINYBIRD_TOKEN=your_tinybird_token
   ```

3. **Deploy the configuration**:
   ```bash
   cd tinybird
   ./setup.sh
   ```

### Environment Variables

Add these to your `.env.local` file:

```env
TINYBIRD_API_URL=https://api.tinybird.co
TINYBIRD_TOKEN=your_tinybird_token
```

## Data Sources

### website_events

Stores all website tracking events with the following schema:

- `timestamp` - Event timestamp (DateTime64)
- `workspace_id` - Workspace identifier (String)
- `visitor_id` - Unique visitor identifier (String)
- `session_id` - Session identifier (String)
- `action_type` - Type of action (enter-page, onclick, onsubmit, etc.)
- `url` - Page URL where event occurred
- `element` - CSS selector of clicked element (optional)
- `text` - Text content of element (optional)
- `value` - Form field value (optional)
- `properties` - Additional event properties as JSON string (optional)
- `user_agent` - Browser user agent
- `referrer` - Page referrer
- `email_hash` - Hashed email for identified users (optional)
- `email_domain` - Email domain for company attribution (optional)

### user_identities

Stores user identification data:

- `workspace_id` - Workspace identifier
- `visitor_id` - Unique visitor identifier
- `email_hash` - Hashed email address
- `email_domain` - Email domain
- `identified_at` - Timestamp when user was identified
- `properties` - Additional user properties as JSON string (optional)

## Pipes (Query Endpoints)

### page_views

Returns page view analytics by date and URL.

**Endpoint**: `https://api.tinybird.co/v0/pipes/page_views.json`

**Parameters**:
- `workspace_id` (required) - Workspace to query
- `start_date` (optional) - Start date (default: 2024-01-01)
- `end_date` (optional) - End date (default: 2024-12-31)

**Response**:
```json
{
  "data": [
    {
      "date": "2025-01-08",
      "workspace_id": "workspace_123",
      "url": "https://example.com",
      "page_views": 150,
      "unique_visitors": 75,
      "sessions": 80
    }
  ]
}
```

### event_summary

Returns event count summary by action type.

**Endpoint**: `https://api.tinybird.co/v0/pipes/event_summary.json`

**Parameters**:
- `workspace_id` (required) - Workspace to query
- `start_date` (optional) - Start date
- `end_date` (optional) - End date

### user_journey

Returns detailed user journey for a specific visitor.

**Endpoint**: `https://api.tinybird.co/v0/pipes/user_journey.json`

**Parameters**:
- `workspace_id` (required) - Workspace to query
- `visitor_id` (required) - Visitor to track
- `start_date` (optional) - Start date
- `end_date` (optional) - End date

## Usage in Code

### Sending Events

```typescript
import { getTinybirdClient, transformToTinybirdEvents } from '@/lib/tinybird'

const client = getTinybirdClient()
const { events, identities } = transformToTinybirdEvents(workspaceId, trackingPayload)

// Send events
await client.sendEvents(events)

// Send user identities
await client.sendUserIdentities(identities)
```

### Querying Data

```typescript
import { getTinybirdClient } from '@/lib/tinybird'

const client = getTinybirdClient()

// Get page views for a workspace
const pageViews = await client.queryEvents('page_views', {
  workspace_id: 'workspace_123',
  start_date: '2025-01-01',
  end_date: '2025-01-08'
})

// Get user journey
const journey = await client.queryEvents('user_journey', {
  workspace_id: 'workspace_123',
  visitor_id: 'visitor_456'
})
```

## Testing

Run the Tinybird integration tests:

```bash
npm test -- tinybird
```

This will run:
- Unit tests for the TinybirdClient
- Integration tests for event transformation
- End-to-end tests for the complete flow

## Monitoring

### Connection Health

Test the Tinybird connection:

```typescript
import { getTinybirdClient } from '@/lib/tinybird'

const client = getTinybirdClient()
const isHealthy = await client.testConnection()
```

### Error Handling

The integration is designed to be resilient:
- Tinybird failures don't block event collection
- Errors are logged but requests continue
- Automatic retries with exponential backoff (planned)

## Data Retention

- Events are retained for 365 days (configurable via TTL)
- User identities use ReplacingMergeTree for deduplication
- Partitioned by month for optimal query performance

## Security

- All API calls use Bearer token authentication
- Email addresses are hashed before storage
- No sensitive form data (passwords, credit cards) is stored
- Row-level security enforced via workspace_id filtering

## Troubleshooting

### Common Issues

1. **"TINYBIRD_TOKEN environment variable is required"**
   - Set the TINYBIRD_TOKEN in your environment
   - Check that .env.local is loaded correctly

2. **"Tinybird API error: 401 Unauthorized"**
   - Verify your token is correct and has write permissions
   - Check token hasn't expired

3. **"Tinybird API error: 400 Bad Request"**
   - Check the event schema matches the datasource definition
   - Verify timestamp format is ISO 8601

### Debug Mode

Enable debug logging:

```bash
DEBUG=tinybird* npm run dev
```

This will log all Tinybird API calls and responses.