# E-mail Guru - API Contracts

## Changelog
- [2026-03-08] v1.0: Initial documentation

## Authentication Endpoints

### GET /api/auth/google
Redirects to Google OAuth consent screen.

**Response**: 302 Redirect to Google

### GET /api/auth/callback/google
Handles OAuth callback from Google.

**Query Parameters**:
- `code` - Authorization code from Google
- `error` - Error type if authentication failed

**Response**: 302 Redirect to `/dashboard` or `/?error=<type>`

### POST /api/auth/logout
Clears session cookies.

**Response**:
```json
{ "success": true }
```

## Gmail Endpoints

### GET /api/gmail/emails
List or get specific email(s).

**Query Parameters**:
- `q` (optional) - Gmail search query
- `limit` (optional, default: 20) - Max emails to return
- `id` (optional) - Get single email by ID

**Response (list)**:
```json
{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "string",
        "threadId": "string",
        "from": "string",
        "to": ["string"],
        "subject": "string",
        "snippet": "string",
        "bodyText": "string",
        "bodyHtml": "string",
        "hasAttachments": false,
        "attachmentsTotalBytes": 0,
        "receivedAt": "ISO-8601 string",
        "isRead": false,
        "isStarred": false,
        "labels": ["string"],
        "classification": {
          "category": "invoice|business-opportunity|...",
          "confidence": 0.0-1.0,
          "reasons": ["string"],
          "suggestedAction": "string"
        }
      }
    ],
    "total": 0
  }
}
```

### POST /api/gmail/send
Send an email.

**Request Body**:
```json
{
  "to": ["email@example.com"],
  "subject": "string",
  "body": "string (HTML)",
  "replyToId": "string (optional, threadId for replies)"
}
```

**Response**:
```json
{
  "success": true,
  "data": { "messageId": "string" }
}
```

### POST /api/gmail/actions
Perform email actions.

**Request Body**:
```json
{
  "action": "markRead|archive|delete|star",
  "emailId": "string",
  "starred": true  // Only for star action
}
```

**Response**:
```json
{ "success": true }
```

## AI Endpoints

### POST /api/ai/classify
Classify a single email using AI.

**Request Body**:
```json
{
  "email": {
    "id": "string",
    "from": "string",
    "to": ["string"],
    "subject": "string",
    "snippet": "string",
    "bodyText": "string",
    "hasAttachments": false,
    "attachmentsTotalBytes": 0
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "emailId": "string",
    "classification": {
      "category": "invoice|business-opportunity|client-communication|service-alert|spam|storage-review|other",
      "confidence": 0.0-1.0,
      "reasons": ["string"],
      "suggestedAction": "string"
    }
  }
}
```

### POST /api/ai/batch-classify
Classify multiple emails (max 10 per request).

**Request Body**:
```json
{
  "emails": [/* Array of email objects */]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "emailId": "string",
        "classification": { /* classification object */ }
      }
    ]
  }
}
```

### POST /api/ai/smart-reply
Generate smart reply suggestions.

**Request Body**:
```json
{
  "email": { /* email object */ }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "emailId": "string",
    "replies": [
      {
        "id": "string",
        "text": "string",
        "tone": "professional|friendly|brief"
      }
    ]
  }
}
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"  // Optional
}
```

Common error codes:
- `UNAUTHORIZED` - Missing or invalid authentication
- `400` - Bad request (validation failed)
- `404` - Resource not found
- `500` - Server error
