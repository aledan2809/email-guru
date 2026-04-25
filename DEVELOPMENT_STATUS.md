# Project Status - E-mail Guru
Last Updated: 2026-03-18 12:00

## Current State
- **Gmail OAuth**: Working (alexdanciulescu@gmail.com connected)
- **Gmail API**: Enabled and working (emails load, send, star, archive, delete)
- **Outlook Provider**: Fully implemented (Microsoft Graph API)
- **IMAP Provider**: Fully implemented (imapflow + nodemailer)
- **Multi-account**: Account switcher in sidebar, provider-aware routing
- **AI Classification**: Uses Claude CLI (OAuth session, no API credits)
- **Rule-based Classification**: Working with 5 default rules
- **Classification Persistence**: Server-side JSON file store (`data/classifications.json`)
- **Real-time Notifications**: Gmail Pub/Sub webhook endpoint ready
- **Build**: Passing (37 routes, zero errors)
- **Dev Server**: Port 3101 (matches Google OAuth redirect URI)
- **Tailwind**: Downgraded to v3 (v4 has Windows Turbopack /dev/null bug)

## Features Implemented (2026-03-18 Session 2)
- [x] Gmail Pub/Sub webhook for real-time email notifications
- [x] Webhook endpoint `/api/webhook/gmail` receives push notifications
- [x] Auto-classify new emails on webhook arrival
- [x] Notification badge in Dashboard header (bell icon with count)
- [x] Toast notifications for new emails (slide-in animation)
- [x] Gmail watch API (`/api/gmail/watch` - POST/GET/DELETE)
- [x] Watch subscription store (`data/watch-subscriptions.json`)
- [x] Notifications polling API (`/api/notifications` - GET/DELETE)
- [x] useNotifications hook for real-time updates
- [x] useGmailWatch hook for watch management
- [x] Settings > Notifications updated with Pub/Sub configuration info

## Features Implemented (2026-03-18 Session 1)
- [x] Multi-account support UI (account switcher dropdown in sidebar)
- [x] Provider-aware email routing (Gmail direct API, Outlook/IMAP via /api/mail)
- [x] Real IMAP implementation (imapflow for IMAP, nodemailer for SMTP)
- [x] IMAP account management API (POST/GET/DELETE /api/accounts/imap)
- [x] IMAP presets (Yahoo, AOL, iCloud, Zoho, custom)
- [x] IMAP account setup form in Settings > Account tab
- [x] Server-side classification persistence (JSON file store)
- [x] Classification sync on email load (merges saved classifications)
- [x] Unified email API (/api/mail) for Outlook + IMAP providers

## Features Implemented (2026-03-17)
- [x] Light/Dark/System theme toggle (Settings > Appearance)
- [x] Keyboard shortcuts (C=compose, J/K=navigate, R=refresh, etc.)
- [x] Email templates (Settings > Templates, 3 defaults + CRUD)
- [x] Custom classification rules (Settings > Rules, localStorage)
- [x] Custom categories (Settings > Categories, auto-create from Rules)
- [x] Invoice extraction via AI (Claude CLI)
- [x] Smart reply generation via AI (Claude CLI)
- [x] Gmail label sync (auto-apply labels like EmailGuru/Invoice)
- [x] Scheduled jobs UI (Settings > Scheduled)
- [x] Mobile responsive (hamburger menu, touch-friendly)
- [x] Progressive batch classify (newest first, UI updates per email)
- [x] Manual reclassification (click badge → dropdown → change category)
- [x] "Other" category with free text → auto-creates custom category

## Previous Features (2026-03-08)
- [x] Landing page with Google OAuth login
- [x] Gmail API integration (list, read, send, modify emails)
- [x] Dashboard with folder navigation (inbox, starred, sent, drafts, trash)
- [x] Email list view with sender, subject, snippet display
- [x] Email detail view with full body rendering
- [x] Compose modal with reply/forward support
- [x] AI email classification (7 categories)
- [x] Smart reply suggestions (3 tones)
- [x] Batch email classification
- [x] Category filtering in sidebar
- [x] Search functionality
- [x] Statistics panel
- [x] Settings page

## TODO
- [ ] Email forwarding rules
- [ ] Advanced search filters
- [ ] Outlook OAuth callback implementation
- [ ] IMAP IDLE for real-time IMAP notifications

## Recent Changes
- 2026-03-18 (Session 2): Webhook and real-time notifications
  - Created `/api/webhook/gmail` to receive Gmail Pub/Sub push notifications
  - Created `/api/gmail/watch` (POST/GET/DELETE) for watch subscription management
  - Created `/api/notifications` (GET/DELETE) for polling new email notifications
  - Created `src/lib/watch-store.ts` for watch subscription persistence
  - Created `src/hooks/useNotifications.ts` with polling and toast integration
  - Created `src/components/ui/Toast.tsx` with slide-in animation
  - Added notification bell icon with badge count to Dashboard header
  - Added Gmail history API for fetching new messages since last notification
  - Updated Settings > Notifications with Pub/Sub configuration info
  - Added `animate-slide-in` keyframe animation to globals.css
- 2026-03-18 (Session 1): Multi-account, IMAP, classification persistence
  - Created `/api/classifications` (GET/POST) with JSON file store
  - Created `/api/mail` unified endpoint for Outlook + IMAP
  - Created `/api/accounts/imap` (POST/GET/DELETE) for IMAP account management
  - Implemented real IMAPProvider with imapflow (connect, list, get, send, actions)
  - Added nodemailer SMTP transport for IMAP email sending
  - Updated Sidebar with account switcher dropdown
  - Updated Dashboard to be multi-account aware
  - Updated useEmails hook with provider routing + classification persistence
  - Updated /api/accounts to include IMAP accounts
  - Installed imapflow, nodemailer, @types/nodemailer
- 2026-03-17: Full feature implementation session
- 2026-03-08: Production build verified

## Technical Notes
- Google OAuth redirect URI: http://localhost:3101/api/auth/callback/google
- Google Cloud project: 594240948902 (AI Agent - n8n)
- Gmail API must be enabled in Google Cloud Console
- Tailwind v4 @tailwindcss/postcss crashes Turbopack on Windows (reads /dev/null → nul)
- Claude CLI path: ~/.local/bin/claude (uses OAuth, not API key)
- ANTHROPIC_API_KEY is stripped from env when calling CLI to force OAuth
- Classifications stored in `data/classifications.json` (gitignored)
- IMAP accounts stored in `data/imap-accounts.json` (gitignored)
- Watch subscriptions stored in `data/watch-subscriptions.json` (gitignored)
- IMAP passwords stored in plaintext (encrypt for production)
- Provider routing: Gmail uses direct `/api/gmail/*`, Outlook/IMAP use `/api/mail`

### Gmail Pub/Sub Setup
To enable real-time email notifications:
1. Create a Google Cloud Pub/Sub topic
2. Create a push subscription pointing to `https://YOUR_DOMAIN/api/webhook/gmail`
3. Grant `gmail-api-push@system.gserviceaccount.com` Pub/Sub Publisher role
4. Set `GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT/topics/YOUR_TOPIC` in `.env.local`
5. (Optional) Set `AUTO_CLASSIFY_NEW_EMAILS=true` to auto-classify on arrival

## Architecture
### API Routes (37 total)
- `/api/mail` - Unified email endpoint (Gmail, Outlook, IMAP)
- `/api/gmail/*` - Gmail-specific endpoints (backwards compat)
- `/api/gmail/watch` - Gmail push notification subscription management
- `/api/webhook/gmail` - Gmail Pub/Sub push notification receiver
- `/api/notifications` - Poll for new email notifications
- `/api/accounts` - List all connected accounts (cookies + IMAP store)
- `/api/accounts/imap` - IMAP account CRUD
- `/api/classifications` - Classification persistence (GET/POST)
- `/api/ai/*` - AI features (classify, smart-reply, extract-invoice)
- `/api/auth/*` - OAuth flows (Google, Outlook, logout)

### Data Storage
- Cookies: Gmail/Outlook OAuth tokens + user info
- JSON files: `data/classifications.json`, `data/imap-accounts.json`, `data/watch-subscriptions.json`, `data/new-email-notifications.json`
- localStorage: Rules, categories, templates, theme, Gmail sync toggle

## Environment Setup
Required environment variables in `.env.local`:
- `ANTHROPIC_API_KEY` - For AI classification (backup, CLI preferred)
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `GOOGLE_REDIRECT_URI` - http://localhost:3101/api/auth/callback/google
- `OUTLOOK_CLIENT_ID` - (optional) Microsoft Azure AD app
- `OUTLOOK_CLIENT_SECRET` - (optional) Microsoft Azure AD app
- `GMAIL_PUBSUB_TOPIC` - (optional) Google Cloud Pub/Sub topic for push notifications
- `AUTO_CLASSIFY_NEW_EMAILS` - (optional) Set to "true" to auto-classify on webhook
