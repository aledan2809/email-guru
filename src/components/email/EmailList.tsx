'use client';

import { Star, Paperclip } from 'lucide-react';
import type { Email } from '@/types/email';
import { CategoryBadge } from '@/components/ui/Badge';

interface EmailListProps {
  emails: Email[];
  selectedId?: string;
  onSelect: (email: Email) => void;
  onStar: (emailId: string, starred: boolean) => void;
  loading?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/"/g, '');
  return from.split('@')[0];
}

export function EmailList({ emails, selectedId, onSelect, onStar, loading }: EmailListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
        <p>No emails found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {emails.map((email) => (
        <div key={email.id} onClick={() => onSelect(email)}
          className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-[var(--bg-hover)] ${
            selectedId === email.id ? 'bg-[var(--bg-tertiary)]' : ''
          } ${!email.isRead ? 'bg-[var(--bg-hover)]' : ''}`}>
          <button onClick={(e) => { e.stopPropagation(); onStar(email.id, !email.isStarred); }}
            className={`flex-shrink-0 p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors ${
              email.isStarred ? 'text-yellow-500' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'
            }`}>
            <Star className="w-4 h-4" fill={email.isStarred ? 'currentColor' : 'none'} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`font-medium truncate ${!email.isRead ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                {extractSenderName(email.from)}
              </span>
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{formatDate(email.receivedAt)}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`truncate ${!email.isRead ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                {email.subject || '(No subject)'}
              </span>
              {email.hasAttachments && <Paperclip className="w-3 h-3 text-[var(--text-faint)] flex-shrink-0" />}
            </div>
            <p className="text-sm text-[var(--text-muted)] truncate">{email.snippet}</p>
            {email.classification && (
              <div className="mt-2">
                <CategoryBadge category={email.classification.category} confidence={email.classification.confidence} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
