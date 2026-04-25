# E-mail Guru - Project Overview

## Changelog
- [2026-03-08] v1.0: Initial documentation

## Purpose
E-mail Guru is an AI-powered email management application designed to intelligently process, classify, and suggest actions for emails from multiple accounts. The system automates email triage, reducing the time spent on manual email management.

## Target Users
- Business professionals managing multiple email accounts
- Users dealing with high email volume
- Anyone wanting automated email organization and smart responses

## Problem Solved
- Information overload from email
- Manual sorting of invoices, business opportunities, client communications
- Identifying spam and junk efficiently
- Managing large attachments consuming storage
- Missing important service alerts in cluttered inboxes

## Business Goals
- Reduce time spent on email management by 70%
- Auto-classify emails with 90%+ accuracy
- Provide actionable suggestions for each email category
- Learn from user decisions to improve over time

## Architecture

### Stack
- **Frontend**: Next.js 16 with React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **AI Services**:
  - Anthropic Claude (primary AI for classification and smart replies)
  - OpenAI (optional secondary)
- **Email Provider**: Gmail via Google OAuth2 and Gmail API
- **Port**: 3000 (development)

### Key Components
```
src/
├── app/
│   ├── page.tsx          # Landing page with OAuth login
│   ├── dashboard/        # Main email management UI
│   ├── settings/         # User settings
│   └── api/
│       ├── auth/         # Google OAuth handlers
│       ├── gmail/        # Gmail API operations
│       └── ai/           # AI classification endpoints
├── components/
│   ├── email/            # EmailList, EmailView, ComposeModal
│   ├── layout/           # Sidebar navigation
│   └── ui/               # Button, Input, Badge components
├── hooks/
│   └── useEmails.ts      # Email state management hook
├── lib/
│   ├── gmail.ts          # Gmail API client
│   ├── ai-classifier.ts  # Claude AI integration
│   └── email-classifier.ts # Rule-based fallback classifier
└── types/
    └── email.ts          # TypeScript interfaces
```

### Key Features

1. **Gmail Integration**
   - OAuth2 authentication
   - Read, send, and modify emails
   - Archive, delete, star operations

2. **AI-Powered Classification**
   - Categories: invoice, business-opportunity, client-communication, service-alert, spam, storage-review, other
   - Confidence scores
   - Suggested actions per category

3. **Smart Reply Generation**
   - Three tone options: professional, friendly, brief
   - Context-aware suggestions

4. **Batch Processing**
   - Classify multiple emails at once
   - Progress tracking
   - Statistics dashboard

5. **Dashboard Features**
   - Folder navigation (inbox, starred, sent, drafts, trash)
   - Category filters
   - Search functionality
   - Compose/reply modal

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google` | GET | Initiate Google OAuth |
| `/api/auth/callback/google` | GET | OAuth callback handler |
| `/api/auth/logout` | POST | Clear session |
| `/api/gmail/emails` | GET | List/get emails |
| `/api/gmail/send` | POST | Send email |
| `/api/gmail/actions` | POST | Mark read, star, archive, delete |
| `/api/ai/classify` | POST | Classify single email |
| `/api/ai/batch-classify` | POST | Classify multiple emails |
| `/api/ai/smart-reply` | POST | Generate reply suggestions |
| `/api/health` | GET | Health check |

## Environment Variables

```env
# AI Services
ANTHROPIC_API_KEY=        # Required for AI classification

# Gmail OAuth2
GOOGLE_CLIENT_ID=         # From Google Cloud Console
GOOGLE_CLIENT_SECRET=     # From Google Cloud Console
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Future Enhancements
- Multiple email account support (Outlook, IMAP)
- Custom classification rules/training
- Scheduled email processing
- Invoice extraction and storage
- Email templates
- Keyboard shortcuts
