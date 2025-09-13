## MetricPal Data Flow

### Overview
This document explains how website events flow from the tracking script to storage and analytics, including authentication, validation, forwarding to Tinybird, and how to query results.

### 1) Tracking Script on Customer Site
- Installed on pages (example shown for local dev):
```html
<script 
  src="http://localhost:3000/Trackingscript.js"
  apikey="mp_WORKSPACE_API_KEY"
  data-debug="true"
  data-endpoint="http://localhost:3000/api/v1/collect/optimized?api_key=mp_WORKSPACE_API_KEY">
</script>
```
- Auto-captures events: enter-page, onclick, onsubmit, onsearch, scroll-depth, end-session, identify, custom, goal.
- Sends batched payloads to `data-endpoint` using Beacon/XHR.

Payload shape (simplified):
```json
{
  "customerObject": { "website": "example.com", "apiKey": "mp_...", "version": "2.2.0" },
  "userObject": {
    "language": "en-US", "platform": "MacIntel", "uuid": "visitor-uuid",
    "sessionData": { "id": "session-id", "startTime": "ISO8601", "referrer": "...", "landingPage": "..." }
  },
  "actionLog": [ { "timestamp": "ISO8601", "action_type": "enter-page", "url": "...", ... } ],
  "referrer": "..."
}
```

### 2) API Authentication & CORS
- Endpoint: `POST /api/v1/collect/optimized` (or `/api/v1/collect`).
- Auth: requires workspace API key via `x-api-key` header or `?api_key=...` query param (preferred for cross-origin script).
- CORS allows `https://metricpal.framer.website` and local hosts.

### 3) Validation & Processing (Next.js Route Handlers)
Files: `src/app/api/v1/collect/route.ts`, `src/app/api/v1/collect/optimized/route.ts`
- Steps:
  1. Validate API key against Supabase `workspaces` by `api_key`.
  2. Parse JSON body; return 400 on invalid/empty payload.
  3. Validate schema with Ajv (required fields in `customerObject`, `userObject`, and `actionLog`).
  4. Log summary and per-event debug info.
  5. Transform and forward to Tinybird (non-blocking; errors logged but collection still succeeds).

### 4) Transform → Tinybird Schema
File: `src/lib/tinybird.ts`
- Transforms tracking payload to flat records matching Tinybird datasources:
  - website_events (NDJSON):
    - Required: `timestamp` (DateTime64), `workspace_id`, `visitor_id`, `session_id`, `action_type`, `url`, `user_agent`, `referrer`.
    - Optional: `element`, `text`, `value`, `properties` (stringified JSON), `email_hash`, `email_domain`.
  - user_identities (NDJSON, only for identify events):
    - `workspace_id`, `visitor_id`, `email_hash` (SHA-256), `email_domain`, `identified_at`, `properties` (stringified JSON).
- Reliability fixes to avoid quarantine:
  - NDJSON with `Content-Type: application/x-ndjson`.
  - Non-null fallbacks for required fields: `user_agent` = "unknown" if absent; `referrer` = "" if absent.
  - `properties` always stringified.

### 5) Storage in Tinybird
Folder: `tinybird/`
- Datasources:
  - `datasources/website_events.datasource` (MergeTree)
  - `datasources/user_identities.datasource` (ReplacingMergeTree)
- Pipes/Endpoints:
  - `pipes/event_summary.pipe` → `/v0/pipes/event_summary.json`
  - `pipes/page_views.pipe` → `/v0/pipes/page_views.json`
  - `pipes/user_journey.pipe` → `/v0/pipes/user_journey.json`
- Setup script: `tinybird/setup.sh` (requires Tinybird CLI `tb` and `TINYBIRD_TOKEN`).

### 6) Query Examples
Environment: `TINYBIRD_API_URL` (region host), `TINYBIRD_TOKEN`.
```bash
# Summary by action type (use correct workspace_id, and DateTime range if needed)
curl -sG "$TINYBIRD_API_URL/v0/pipes/event_summary.json" \
  -H "Authorization: Bearer $TINYBIRD_TOKEN" \
  --data-urlencode "workspace_id=WORKSPACE_ID" \
  --data-urlencode "start_date=2025-01-01 00:00:00" \
  --data-urlencode "end_date=2025-12-31 23:59:59" | jq

# Page views
curl -sG "$TINYBIRD_API_URL/v0/pipes/page_views.json" \
  -H "Authorization: Bearer $TINYBIRD_TOKEN" \
  --data-urlencode "workspace_id=WORKSPACE_ID" \
  --data-urlencode "start_date=2025-01-01 00:00:00" \
  --data-urlencode "end_date=2025-12-31 23:59:59" | jq

# User journey for a visitor
curl -sG "$TINYBIRD_API_URL/v0/pipes/user_journey.json" \
  -H "Authorization: Bearer $TINYBIRD_TOKEN" \
  --data-urlencode "workspace_id=WORKSPACE_ID" \
  --data-urlencode "visitor_id=VISITOR_ID" \
  --data-urlencode "start_date=2025-01-01 00:00:00" \
  --data-urlencode "end_date=2025-12-31 23:59:59" | jq
```

### 7) Troubleshooting
- 401 Unauthorized: Add `?api_key=mp_...` to `data-endpoint` or send `x-api-key` header.
- 400 Validation: Ensure required fields and correct event types; see response `error.details.validationErrors`.
- Quarantine in Tinybird: Check Quarantine tab for the datasource. Common causes:
  - Posted JSON array instead of NDJSON → fixed by `application/x-ndjson` and one JSON object per line.
  - Null/incorrect types for required columns → defaults and stringification added.
- Empty pipe results: Provide DateTime params for the correct year (pipes defaulted to 2024 in templates).

### 8) Environment
Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TINYBIRD_API_URL=https://api.europe-west2.gcp.tinybird.co
TINYBIRD_TOKEN=...
```

### 9) Security Notes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `TINYBIRD_TOKEN` to the browser.
- `NEXT_PUBLIC_*` vars are safe for client usage.
- `.env.local` is git-ignored; share only `.env.example` with placeholders.


