# MetricPal Tracking Script Documentation

## Overview

The MetricPal tracking script (Trackingscript.js) is a comprehensive, privacy-first website analytics solution that automatically captures user interactions and behavior. This document outlines its current capabilities and integration with the backend API.

## Current Capabilities

### 1. Core Features ✅

#### Privacy-First Tracking
- **Cookieless Mode**: Uses browser fingerprinting when `data-cookieless="true"`
- **Privacy Mode**: Hashes emails before transmission when `data-privacy-mode="true"`
- **GDPR Compliance**: Respects user consent and provides opt-out mechanisms
- **Bot Detection**: Advanced bot filtering to prevent false data collection

#### Auto-Capture Events
- **Page Views**: Automatic tracking of page visits and navigation
- **Click Tracking**: Captures clicks with CSS path, text content, and target URLs
- **Form Submissions**: Intelligent form detection and submission tracking
- **Scroll Depth**: Tracks scroll milestones at 25%, 50%, 75%, 90%, and 100%
- **Session Management**: Handles session timeouts and cross-page navigation

#### User Identification
- **Email Auto-Detection**: Automatically identifies users from form fields
- **URL Parameter Identification**: Extracts email from URL parameters
- **Cross-Frame Communication**: Supports identification across iframes
- **Custom Properties**: Allows setting custom user attributes

### 2. Configuration Options

The script supports extensive configuration through data attributes:

```html
<script 
  src="https://your-domain.com/tracking.js"
  apikey="your-api-key"
  data-endpoint="https://your-api.com/api/v1/collect/optimized"
  data-cookieless="false"
  data-privacy-mode="false"
  data-auto-identify="true"
  data-only-identify="false"
  data-cross-domain="false"
  data-debug="false"
  data-batch-size="50"
  data-session-timeout="30"
  data-interval-start="5000"
  data-interval-increment="2000"
></script>
```

### 3. Event Types Captured

#### Standard Events
- `enter-page`: Page view events
- `onclick`: Click interactions with element details
- `onsubmit`: Form submissions with form data
- `onsearch`: Search form submissions
- `scroll-depth`: Scroll milestone tracking
- `end-session`: Session termination events
- `identify`: User identification events

#### Custom Events
- `custom`: Custom events via `MetricPal.trackEvent()`
- `goal`: Goal tracking via `MetricPal.trackGoal()`

### 4. Data Structure

The script sends data in the following format to the `/api/v1/collect/optimized` endpoint:

```json
{
  "customerObject": {
    "website": "example.com",
    "apiKey": "mp_xxx",
    "version": "2.2.0",
    "isFingerprint": false,
    "debugMode": false,
    "serverPath": "/optimized",
    "serverURL": "https://api.example.com/api/v1/collect/optimized"
  },
  "userObject": {
    "language": "en-US",
    "platform": "MacIntel",
    "uuid": "visitor-uuid",
    "identity": "hashed-email-or-null",
    "custom": {},
    "shared": [],
    "sessionData": {
      "id": "session-id",
      "startTime": "2025-01-08T12:00:00.000Z",
      "referrer": "https://google.com",
      "landingPage": "https://example.com"
    }
  },
  "actionLog": [
    {
      "timestamp": "2025-01-08T12:00:00.000Z",
      "action_type": "enter-page",
      "url": "https://example.com",
      "element": null,
      "text": null,
      "value": null,
      "properties": null
    }
  ],
  "referrer": "https://google.com"
}
```

### 5. Advanced Features

#### Form Intelligence
- **Email Detection**: Automatically identifies email fields in forms
- **Validation Checking**: Respects HTML5 form validation
- **Dynamic Form Detection**: Detects forms added after page load
- **Search Form Recognition**: Identifies and tracks search forms separately

#### Session Management
- **Activity Tracking**: Monitors user activity to maintain sessions
- **Timeout Handling**: Automatically ends sessions after inactivity
- **Cross-Page Navigation**: Maintains session across page changes
- **Mobile Optimization**: Handles mobile-specific behaviors (page hide/show)

#### Integration Support
- **HubSpot Forms**: Native integration with HubSpot form callbacks
- **HubSpot Meetings**: Tracks meeting bookings
- **Klaviyo Forms**: Integration with Klaviyo form submissions
- **Cross-Frame Messaging**: Supports iframe-based integrations

### 6. Public API Methods

The script exposes several methods for programmatic interaction:

```javascript
// User identification
MetricPal.identify('user@example.com', { customProp: 'value' })

// Custom event tracking
MetricPal.trackEvent('Button Click', { button: 'CTA' })

// Goal tracking
MetricPal.trackGoal('Newsletter Signup', { source: 'homepage' })

// Shared properties
MetricPal.addSharedProperty({ 
  key: 'plan', 
  value: 'premium', 
  properties: {} 
})

// Configuration access
const config = MetricPal.getConfig()
const visitorId = MetricPal.getVisitorId()
const isIdentified = MetricPal.isIdentified()
```

### 7. Error Handling & Reliability

#### Transmission Methods
- **Beacon API**: Primary method for reliable data transmission
- **XHR Fallback**: Automatic fallback when Beacon API is unavailable
- **Retry Logic**: Built-in retry mechanisms for failed transmissions

#### Error Recovery
- **Silent Failures**: Errors don't break the host website
- **Graceful Degradation**: Continues functioning even with partial failures
- **Debug Mode**: Comprehensive logging when debug mode is enabled

### 8. Performance Optimizations

#### Efficient Data Collection
- **Batch Processing**: Groups events for efficient transmission
- **Interval-Based Sending**: Configurable intervals to balance real-time vs. performance
- **Memory Management**: Clears processed events to prevent memory leaks
- **Lazy Loading**: Minimal initial footprint with on-demand feature loading

#### Browser Compatibility
- **Modern Browser Support**: Full feature set for modern browsers
- **Legacy Fallbacks**: Graceful degradation for older browsers
- **Mobile Optimization**: Optimized for mobile device constraints

## Integration Status

### ✅ Completed Integration Features

1. **Backend API Compatibility**: Script payload format matches backend schema
2. **API Key Authentication**: Supports both header and payload API key validation
3. **Event Schema Validation**: All event types are properly validated by backend
4. **Error Handling**: Comprehensive error responses from backend
5. **Health Checks**: Both script and backend support health monitoring

### 🔄 Current Configuration

The script is currently configured to send data to:
- **Primary Endpoint**: `/api/v1/collect/optimized`
- **Fallback Endpoint**: `/api/v1/collect`
- **Default Server**: `http://localhost:8000` (development)

### 📋 Next Steps (Future Tasks)

1. **Tinybird Integration**: Forward events from API to Tinybird for storage
2. **Real-time Processing**: Implement real-time event processing pipeline
3. **Advanced Analytics**: Add computed metrics and aggregations
4. **Dashboard Integration**: Connect events to dashboard visualizations

## Testing Coverage

The integration includes comprehensive tests for:
- ✅ Valid event collection with proper API key
- ✅ API key validation (missing, invalid, mismatched)
- ✅ Payload validation (schema compliance)
- ✅ Error handling and response formats
- ✅ Health check endpoints
- ✅ Empty action log handling

## Security Features

1. **API Key Protection**: Secure API key validation
2. **Input Sanitization**: All inputs are validated and sanitized
3. **Rate Limiting Ready**: Backend prepared for rate limiting implementation
4. **CORS Handling**: Proper cross-origin request handling
5. **Privacy Compliance**: Built-in privacy features and data protection

This tracking script provides a robust, production-ready foundation for website analytics with comprehensive event collection, privacy protection, and seamless backend integration.