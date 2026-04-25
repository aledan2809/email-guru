'use client';

import { useState, useEffect } from 'react';
import { X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Email } from '@/types/email';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (to: string[], subject: string, body: string, replyToId?: string) => Promise<void>;
  replyTo?: Email;
  initialBody?: string;
  initialSubject?: string;
}

export function ComposeModal({ isOpen, onClose, onSend, replyTo, initialBody, initialSubject }: ComposeModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (replyTo) {
      const fromEmail = replyTo.from.match(/<([^>]+)>/)?.[1] || replyTo.from;
      setTo(fromEmail);
      setSubject(replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`);
      setBody(initialBody || `\n\n---\nOn ${new Date(replyTo.receivedAt).toLocaleString()}, ${replyTo.from} wrote:\n\n${replyTo.bodyText || replyTo.snippet}`);
    } else {
      setTo('');
      setSubject(initialSubject || '');
      setBody(initialBody || '');
    }
  }, [replyTo, initialBody, initialSubject]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return;

    setSending(true);
    try {
      const recipients = to.split(',').map((e) => e.trim()).filter(Boolean);
      await onSend(recipients, subject, body, replyTo?.threadId);
      onClose();
    } catch (error) {
      console.error('Failed to send:', error);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-4 w-80 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-t-lg shadow-xl z-50">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <span className="text-sm font-medium truncate">
            {subject || 'New Message'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(false)}
              className="p-1 hover:bg-[var(--bg-hover)] rounded"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[var(--bg-hover)] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col safe-bottom">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[var(--border)] flex-shrink-0">
          <span className="font-medium">
            {replyTo ? 'Reply' : 'New Message'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="hidden sm:block p-2 hover:bg-[var(--bg-hover)] rounded"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-hover)] rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
          <Input
            placeholder="Recipients (comma-separated)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            placeholder="Write your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full h-48 sm:h-64 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-between p-3 sm:p-4 border-t border-[var(--border)] flex-shrink-0 gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">
            Discard
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            loading={sending}
            disabled={!to.trim() || !subject.trim()}
            className="flex-1 sm:flex-none"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
