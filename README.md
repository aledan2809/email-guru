# E-mail Guru

AI-powered email management application that intelligently processes, classifies, and suggests actions for emails from multiple accounts.

## 🎯 Features

- **Multi-Provider Support**: Gmail OAuth, Outlook OAuth, and IMAP/SMTP
- **AI Classification**: Automatic email categorization using Claude AI
- **Smart Actions**: AI-powered replies, invoice extraction, and bulk operations
- **Real-time Notifications**: Gmail Pub/Sub webhooks and polling notifications
- **Custom Rules**: User-defined classification rules and categories
- **Keyboard Shortcuts**: Full keyboard navigation (C, J, K, R, S, A, D, etc.)
- **Mobile Responsive**: Works on desktop and mobile devices
- **Theme Support**: Light, dark, and system themes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with Gmail API enabled
- Anthropic API key for AI features

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd e-mail-guru

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see Configuration section)

# Run development server
npm run dev
```

The application will be available at `http://localhost:3101`.

## ⚙️ Configuration

Create `.env.local` with the following required variables:

```env
# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key

# Database (SQLite for development)
DATABASE_URL=file:./dev.db

# Gmail OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3101/api/auth/callback/google

# Security
ENCRYPTION_KEY=your_secure_encryption_key_here
GMAIL_WEBHOOK_TOKEN=your_webhook_bearer_token
GMAIL_WEBHOOK_SECRET=your_webhook_hmac_secret

# Optional: Outlook OAuth2
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
OUTLOOK_REDIRECT_URI=http://localhost:3101/api/auth/callback/outlook

# Optional: Features
AUTO_CLASSIFY_NEW_EMAILS=true
DEBUG=false
```

### Google Cloud Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Add your redirect URI: `http://localhost:3101/api/auth/callback/google`
5. For production, set up Pub/Sub topic and push subscription for real-time notifications

### Outlook Setup (Optional)

1. Create an app in [Azure Portal](https://portal.azure.com/) > App registrations
2. Add redirect URI: `http://localhost:3101/api/auth/callback/outlook`
3. Grant Mail.Read, Mail.Send, offline_access permissions

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Storage**: JSON files (development), SQLite ready
- **Authentication**: OAuth 2.0 (Gmail, Outlook), IMAP credentials
- **AI**: Anthropic Claude API
- **Real-time**: Google Pub/Sub webhooks, polling fallback

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Main email interface
│   ├── settings/          # Configuration UI
│   └── setup/             # Initial setup guide
├── components/
│   ├── email/             # Email-specific components
│   ├── layout/            # Layout components
│   └── ui/                # Reusable UI components
├── hooks/                 # React hooks
├── lib/                   # Utilities and integrations
│   ├── email-providers/   # Gmail, Outlook, IMAP providers
│   └── *.ts              # Various utilities
└── types/                 # TypeScript definitions
```

## 📧 Email Providers

### Gmail
- Full OAuth 2.0 integration
- Real-time notifications via Pub/Sub
- Supports all Gmail features (labels, search, etc.)

### Outlook
- OAuth 2.0 with Microsoft Graph API
- Full email management capabilities
- Office 365 and personal account support

### IMAP/SMTP
- Any IMAP provider (Yahoo, ProtonMail, custom)
- Secure password encryption at rest
- Manual configuration required

## 🤖 AI Features

### Email Classification
- 7 built-in categories: invoice, business-opportunity, client-communication, service-alert, spam, storage-review, other
- Custom categories with colors and Gmail labels
- Rule-based classification engine
- Batch classification with progress tracking

### Smart Replies
- 3 tone options: professional, friendly, brief
- Context-aware response generation
- Template system for common replies

### Invoice Extraction
- Automatic vendor, amount, and date extraction
- Confidence scoring
- Export capabilities

## 🔐 Security

- **Password Encryption**: IMAP passwords encrypted with AES-256-GCM
- **Webhook Authentication**: Bearer token and HMAC signature verification
- **OAuth Security**: HttpOnly cookies, secure token handling
- **Environment Isolation**: No secrets in client-side code

## 🎹 Keyboard Shortcuts

- `C` - Compose new email
- `J/K` - Navigate up/down
- `R` - Refresh emails
- `S` - Search
- `A` - Archive selected
- `D` - Delete selected
- `T` - Star/unstar
- `Esc` - Close modals
- `AI` keys - AI classification and smart reply

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Health Check

Visit `/setup` to check environment configuration and service connectivity.

### API Documentation

Visit `/api` for endpoint documentation when the server is running.

## 🚀 Deployment

### Environment Setup

1. Set all required environment variables
2. Configure Gmail Pub/Sub for real-time notifications
3. Set up secure `ENCRYPTION_KEY` and webhook tokens
4. Enable debug logging with `DEBUG=true` if needed

### Production Considerations

- Use a proper database (Supabase recommended) instead of JSON files
- Set up proper logging and monitoring
- Configure rate limiting for AI endpoints
- Implement backup strategies for email data

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contributing guidelines here]

## 🐛 Troubleshooting

### Common Issues

1. **Gmail OAuth not working**: Check redirect URI matches exactly
2. **Webhook not receiving notifications**: Verify Pub/Sub setup and authentication
3. **AI classification failing**: Check ANTHROPIC_API_KEY and quota
4. **IMAP connection issues**: Verify host, port, and credentials

### Support

- Check `/setup` page for configuration issues
- Enable debug logging with `DEBUG=true`
- Verify environment variables in `/api/health`

---

Built with ❤️ using Next.js and Claude AI