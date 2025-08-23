# MetricPal Multi-Tenant Analytics - Developer Guide

## System Overview
Multi-tenant B2B analytics platform with comprehensive website tracking, privacy features, and performance optimization.

**Components**: Tracking Script → FastAPI Backend → PostgreSQL → External Services (Tinybird/Supabase)

**Features**: Multi-tenant isolation, 13+ event types, GDPR compliance, real-time processing, cross-frame communication, mobile optimization.

## Multi-Tenant Architecture
```
User → Workspace 1 (API Key) → Tracking Events
    → Workspace 2 (API Key) → Tracking Events  
    → Workspace N (API Key) → Tracking Events
```

**Isolation**: Data scoped to `workspace_id`, unique API keys, filtered queries, user access control.

## Database Schema

**Core Tables:**
```sql
-- Users (FastAPI-Users)
CREATE TABLE "user" (id UUID PRIMARY KEY, email VARCHAR(320) UNIQUE, hashed_password VARCHAR(1024), is_active BOOLEAN DEFAULT TRUE);

-- Workspaces (Multi-tenant)
CREATE TABLE workspaces (id UUID PRIMARY KEY, name VARCHAR(255), api_key VARCHAR(255) UNIQUE, user_id UUID REFERENCES "user"(id));

-- Tracking Events (Analytics)
CREATE TABLE tracking_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    properties JSONB NOT NULL,
    workspace_id UUID REFERENCES workspaces(id)
);

-- Key Indexes
CREATE INDEX idx_workspaces_api_key ON workspaces(api_key);
CREATE INDEX idx_tracking_events_workspace_id ON tracking_events(workspace_id);
CREATE INDEX idx_tracking_events_timestamp ON tracking_events(timestamp);
```

## API Endpoints

**Authentication:**
```http
POST /auth/register {"email": "user@example.com", "password": "secure_password"}
POST /auth/jwt/login username=user@example.com&password=secure_password
```

**Workspaces:**
```http
POST /api/v1/workspaces {"name": "My Website Analytics"}
GET /api/v1/workspaces
```

**Tracking Data:**
```http
POST /api/v1/collect
X-API-Key: mp_live_1234567890abcdef
{"events": [{"event_type": "page_view", "timestamp": "2025-01-08T12:00:00Z", "session_id": "session_123", "properties": {"url": "https://example.com"}}]}

POST /api/v1/collect/optimized
{"customerObject": {"apiKey": "mp_live_123", "website": "example.com"}, "userObject": {"uuid": "visitor_456", "sessionData": {"id": "session_123"}}, "actionLog": [{"timestamp": "2025-01-08T12:00:00Z", "action_type": "enter-page", "url": "https://example.com"}]}
```

## Event Types & Data Flow

**13 Event Types:**
- `page_view` (url, title, referrer) - Auto on page load
- `click` (element_tag, element_text, element_id) - Auto on click  
- `form_submit` (form_id, form_data) - Auto on submit
- `identify` (email, name) - Auto-detect
- `scroll` (scroll_depth) - Auto at 25%, 50%, 75%, 100%
- `custom` (event_name, custom props) - Manual
- `search` (query, search_type) - Auto-detect
- `session_start/end` (duration, reason) - Auto
- `form_interaction` (form_id, element_type) - Auto focus/blur
- `auto_identify` (source, email_domain) - Auto
- `goal` (goal_name, custom props) - Manual
- `page_exit` (final_scroll_depth, time_on_page) - Auto

**Processing Flow:**
Website → Tracking Script → API Endpoint → PostgreSQL → External Services (Tinybird/Supabase)

**JavaScript API Methods:**
```javascript
// Core tracking methods
MetricPal.identify(email, customProperties)
MetricPal.trackEvent(eventName, properties)
MetricPal.goal(goalName, goalProperties, goalDate)
MetricPal.addSharedProperty({key, value, properties})

// Utility methods
MetricPal.getVisitorId()
MetricPal.getUserIdentity()
MetricPal.isIdentified()
MetricPal.getConfig()
MetricPal.sendData(method) // 'beacon' or 'xhr'
MetricPal.endSession(force)

// Advanced methods
MetricPal.getClickInfo(element) // Get element path and info
```

## Authentication & Security

**Multi-Level Auth:**
- User: JWT tokens (dashboard access)
- Workspace: API keys (tracking data)
- Format: `mp_live_1234567890abcdef` / `mp_test_1234567890abcdef`

**Privacy Features:**
- Privacy mode (SHA-1 email hashing)
- Cookieless tracking (fingerprinting)
- Sensitive data redaction
- GDPR compliance (DNT, opt-out)

**Security:**
- Workspace isolation (filtered queries)
- Rate limiting per API key
- Bot detection
- HTTPS only, SQL injection protection

## External Integrations

**Tinybird** (Analytics): Behavioral events (`page_view`, `click`, `scroll`, `custom`)
**Supabase** (CRM): User identification events (`identify`, `form_submit`)

**Third-Party Forms:**
- **HubSpot Forms**: Auto-detect `hsFormCallback` messages and extract email
- **HubSpot Meetings**: Track meeting bookings with `meetingBookSucceeded` events
- **Klaviyo Forms**: Auto-detect `klaviyoForms` events with form ID tracking

**Integration Examples:**
```javascript
// HubSpot Forms (automatic)
window.addEventListener('message', (event) => {
  if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormSubmit') {
    // Automatically tracked and user identified
  }
});

// Klaviyo Forms (automatic)
window.addEventListener('klaviyoForms', (event) => {
  // Automatically tracked with form ID
});

// Manual goal tracking
MetricPal.goal('Meeting Booked on Website', {
  integration: 'HubSpot',
  meetingType: 'demo'
});
```

## Deployment

**Environment Variables:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/metricpal
SECRET_KEY=your-secret-key-here
TINYBIRD_API_TOKEN=your-tinybird-token
SUPABASE_SERVICE_ROLE_KEY=your-supabase-key
```

**Docker Compose:**
```yaml
services:
  postgres: {image: postgres:15, ports: ["5432:5432"]}
  backend: {build: ./fastapi_backend, ports: ["8000:8000"]}
  frontend: {build: ./nextjs-frontend, ports: ["3000:3000"]}
  redis: {image: redis:7-alpine, ports: ["6379:6379"]}
```

**Requirements:** 2+ CPU cores, 4GB+ RAM, 50GB+ SSD, HTTPS

## Quick Start Implementation

### Basic HTML Integration
```html
<script 
    src="https://cdn.metricpal.com/trackingscript.js"
    data-apikey="mp_live_1234567890abcdef"
    data-privacy-mode="false"
    data-auto-identify="true">
</script>

<script>
// Track custom events
MetricPal.trackEvent('button_clicked', {button_name: 'hero_cta'});
MetricPal.goal('newsletter_signup', {source: 'homepage'});
MetricPal.identify('user@example.com', {name: 'John Doe'});
</script>
```

### React Integration
```typescript
// hooks/useMetricPal.ts
export const useMetricPal = (config: {apiKey: string}) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.metricpal.com/trackingscript.js';
    script.setAttribute('data-apikey', config.apiKey);
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, [config]);
  
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    window.MetricPal?.trackEvent(eventName, properties);
  }, []);
  
  return { trackEvent };
};

// Usage
const { trackEvent } = useMetricPal({ apiKey: 'mp_live_123' });
trackEvent('button_clicked', { button_name: 'signup' });
```

### Configuration Options
```html
<script 
    src="trackingscript.js"
    data-apikey="mp_live_1234567890abcdef"
    data-privacy-mode="true"
    data-cookieless="true"
    data-auto-identify="true"
    data-only-identify="false"
    data-cross-domain="true"
    data-debug="false"
    data-interval-start="5000"
    data-interval-increment="2000"
    data-batch-size="50"
    data-session-timeout="30">
</script>
```

**Configuration Parameters:**
- `data-apikey`: Workspace API key (required)
- `data-privacy-mode`: Hash emails with SHA-1 (default: false)
- `data-cookieless`: Use fingerprinting instead of cookies (default: false)
- `data-auto-identify`: Auto-detect emails from forms/URLs (default: true)
- `data-only-identify`: Only track identification events (default: false)
- `data-cross-domain`: Enable cross-domain tracking (default: false)
- `data-debug`: Enable debug logging (default: false)
- `data-interval-start`: Initial send interval in ms (default: 5000)
- `data-interval-increment`: Interval increase per send (default: 2000)
- `data-batch-size`: Max events per batch (default: 50)
- `data-session-timeout`: Session timeout in minutes (default: 30)

### Advanced Features

**Cross-Frame Communication:**
```javascript
// Parent frame receives identification from iframe
window.addEventListener('message', (event) => {
  if (event.data.name === 'metricpal-identify') {
    console.log('User identified:', event.data.identity);
  }
});
```

**Third-Party Integrations:**
- **HubSpot Forms**: Auto-detects `hsFormCallback` messages
- **Klaviyo Forms**: Listens for `klaviyoForms` events
- **HubSpot Meetings**: Tracks meeting bookings

**Enhanced Bot Detection:**
```javascript
// Detects 15+ bot types including:
// - Search engine crawlers (Google, Bing, etc.)
// - Social media bots (Facebook, Twitter, etc.)
// - SEO tools (GTmetrix, Hexometer, etc.)
// - Headless browsers and automation tools
```

**Device & Browser Detection:**
```javascript
// Automatically detects:
// - Device type (desktop, tablet, phone)
// - Browser capabilities
// - Screen resolution and color depth
// - Hardware concurrency
// - Storage capabilities
```

---

## 🧪 Testing & Monitoring

### **1. Testing Strategy**

#### **Unit Tests**:
```python
# Test workspace isolation
def test_workspace_isolation():
    workspace1_events = get_events(workspace_id="workspace-1")
    workspace2_events = get_events(workspace_id="workspace-2")
    
    assert len(workspace1_events) > 0
    assert len(workspace2_events) > 0
    assert not any(e.workspace_id == "workspace-2" for e in workspace1_events)

# Test API key authentication
def test_api_key_auth():
    response = client.post("/api/v1/collect", 
                          headers={"X-API-Key": "invalid-key"},
                          json={"events": []})
    assert response.status_code == 401
```

#### **Integration Tests**:
```python
# Test end-to-end tracking flow
def test_tracking_flow():
    # Create workspace
    workspace = create_test_workspace()
    
    # Send tracking data
    response = client.post("/api/v1/collect/optimized",
                          json=sample_tracking_payload(workspace.api_key))
    
    assert response.status_code == 200
    
    # Verify data in database
    events = get_workspace_events(workspace.id)
    assert len(events) > 0
    assert events[0].workspace_id == workspace.id
```

### **2. Monitoring & Observability**

#### **Key Metrics**:
- **API Response Times**: Track endpoint performance
- **Error Rates**: Monitor 4xx/5xx responses
- **Event Processing**: Track events/second throughput
- **Database Performance**: Query execution times
- **External Service Health**: Tinybird/Supabase availability

#### **Logging Strategy**:
```python
# Structured logging
logger.info("Event processed", extra={
    "workspace_id": workspace.id,
    "event_type": event.event_type,
    "processing_time_ms": processing_time,
    "batch_size": len(events)
})
```

#### **Health Checks**:
```http
GET /api/v1/collect/health
# Returns: {"status": "healthy", "service": "collect"}

GET /health
# Returns: {"status": "healthy", "database": "connected", "external_services": "ok"}
```

---

## 📝 Implementation Checklist

### **Backend Setup**:
- [ ] Set up FastAPI with FastAPI-Users
- [ ] Configure PostgreSQL with proper indexes
- [ ] Implement workspace management endpoints
- [ ] Set up tracking data collection endpoints
- [ ] Configure external service integrations
- [ ] Implement proper error handling and logging
- [ ] Set up authentication and authorization
- [ ] Configure CORS and security headers

### **Frontend Setup**:
- [ ] Create user registration/login flows
- [ ] Build workspace management interface
- [ ] Implement analytics dashboard
- [ ] Create tracking script configuration UI
- [ ] Set up real-time data visualization
- [ ] Implement user settings and preferences

### **Tracking Script**:
- [ ] Deploy `trackingscript.js` v2.2.0
- [ ] Configure CDN distribution
- [ ] Set up script versioning and rollback
- [ ] Test all 13 event types and configurations
- [ ] Validate cross-frame communication
- [ ] Test third-party integrations (HubSpot, Klaviyo)
- [ ] Verify bot detection and privacy features
- [ ] Create integration documentation
- [ ] Set up customer support tools

### **DevOps & Monitoring**:
- [ ] Set up CI/CD pipelines
- [ ] Configure monitoring and alerting
- [ ] Implement backup and disaster recovery
- [ ] Set up performance monitoring
- [ ] Configure log aggregation
- [ ] Implement security scanning

---

## Backend Implementation Examples

### Workspace Management
```python
# app/routes/workspaces.py
@router.post("/", response_model=WorkspaceRead)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    api_key = f"mp_live_{secrets.token_hex(16)}"
    workspace = Workspace(name=workspace_data.name, api_key=api_key, user_id=current_user.id)
    db.add(workspace)
    await db.commit()
    return workspace

@router.get("/", response_model=List[WorkspaceRead])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    result = await db.execute(select(Workspace).where(Workspace.user_id == current_user.id))
    return result.scalars().all()
```

### Optimized Collection Endpoint
```python
# app/routes/collect.py
@router.post("/optimized")
async def collect_optimized(
    payload: OptimizedTrackingPayload,
    workspace: Workspace = Depends(get_workspace_from_api_key),
    db: AsyncSession = Depends(get_async_session)
):
    events = []
    
    for action in payload.actionLog:
        # Map actions to MetricPal events
        event_type = ACTION_TYPE_MAPPING.get(action.action_type, "custom")
        
        properties = {
            "url": action.url,
            "user_agent": request.headers.get("User-Agent"),
            "ip_address": request.client.host,
            **payload.customerObject.dict(),
            **payload.userObject.dict()
        }
        
        # Add action-specific properties
        if hasattr(action, 'element') and action.element:
            properties["element"] = action.element
        if hasattr(action, 'text') and action.text:
            properties["text"] = action.text
        if hasattr(action, 'value') and action.value:
            properties["value"] = action.value
            
        event = TrackingEvent(
            event_type=event_type,
            timestamp=action.timestamp,
            session_id=payload.userObject.sessionData.id,
            user_id=payload.userObject.uuid,
            properties=properties,
            workspace_id=workspace.id
        )
        events.append(event)
    
    db.add_all(events)
    await db.commit()
    
    # Send to external services
    await send_to_external_services(events, workspace)
    
    return {"status": "success", "events_processed": len(events)}

# Action type mapping
ACTION_TYPE_MAPPING = {
    "enter-page": "page_view",
    "onclick": "click", 
    "onsubmit": "form_submit",
    "onsearch": "search",
    "identify": "identify",
    "scroll-depth": "scroll",
    "end-session": "session_end",
    "custom": "custom"
}
```

### Analytics Service
```python
# app/services/analytics.py
class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_overview_metrics(self, workspace_id: UUID, start_date: datetime, end_date: datetime):
        # Page views
        page_views = await self.db.execute(
            select(func.count(TrackingEvent.id))
            .where(
                TrackingEvent.workspace_id == workspace_id,
                TrackingEvent.event_type == "page_view",
                TrackingEvent.timestamp.between(start_date, end_date)
            )
        )
        
        # Unique visitors
        unique_visitors = await self.db.execute(
            select(func.count(func.distinct(TrackingEvent.user_id)))
            .where(
                TrackingEvent.workspace_id == workspace_id,
                TrackingEvent.timestamp.between(start_date, end_date)
            )
        )
        
        # Sessions
        sessions = await self.db.execute(
            select(func.count(func.distinct(TrackingEvent.session_id)))
            .where(
                TrackingEvent.workspace_id == workspace_id,
                TrackingEvent.timestamp.between(start_date, end_date)
            )
        )
        
        return {
            "page_views": page_views.scalar(),
            "unique_visitors": unique_visitors.scalar(),
            "sessions": sessions.scalar(),
            "period": {"start": start_date, "end": end_date}
        }
```

