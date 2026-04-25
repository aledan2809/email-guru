'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft, Star, Archive, Trash2, Reply, Forward,
  MoreVertical, Paperclip, Sparkles, Receipt, ChevronDown,
} from 'lucide-react';
import type { Email, SmartReply, InvoiceData, EmailCategory, CustomCategory } from '@/types/email';
import { Button } from '@/components/ui/Button';
import { CategoryBadge } from '@/components/ui/Badge';

interface EmailViewProps {
  email: Email;
  onBack: () => void;
  onStar: (starred: boolean) => void;
  onArchive: () => void;
  onDelete: () => void;
  onReply: (body?: string) => void;
  onClassify: () => void;
  onReclassify?: (category: EmailCategory, applyToSender?: 'sender' | 'domain') => void;
  onGenerateReplies: () => void;
  onExtractInvoice?: () => void;
  smartReplies: SmartReply[];
  classifying?: boolean;
  generatingReplies?: boolean;
  invoiceData?: InvoiceData | null;
  extractingInvoice?: boolean;
}

const BUILTIN_CATEGORIES = [
  { id: 'invoice', name: 'Invoice' },
  { id: 'business-opportunity', name: 'Business Opportunity' },
  { id: 'client-communication', name: 'Client Communication' },
  { id: 'service-alert', name: 'Service Alert' },
  { id: 'spam', name: 'Spam' },
  { id: 'storage-review', name: 'Storage Review' },
  { id: 'other', name: 'Other' },
];

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailView({
  email, onBack, onStar, onArchive, onDelete, onReply,
  onClassify, onReclassify, onGenerateReplies, onExtractInvoice,
  smartReplies, classifying, generatingReplies,
  invoiceData, extractingInvoice,
}: EmailViewProps) {
  const [showActions, setShowActions] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showApplyToOthers, setShowApplyToOthers] = useState<string | null>(null); // category id after reclassify
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('email_guru_custom_categories');
      if (stored) setCustomCats(JSON.parse(stored));
    } catch {}
  }, []);

  const allCategories = [...BUILTIN_CATEGORIES, ...customCats.map(c => ({ id: c.id, name: c.name }))];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-medium truncate">{email.subject || '(No subject)'}</h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onStar(!email.isStarred)}
            className={email.isStarred ? 'text-yellow-500' : ''}>
            <Star className="w-4 h-4" fill={email.isStarred ? 'currentColor' : 'none'} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onArchive}><Archive className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowActions(!showActions)}>
              <MoreVertical className="w-4 h-4" />
            </Button>
            {showActions && (
              <div className="absolute right-0 mt-2 w-52 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg z-10">
                <button onClick={() => { onClassify(); setShowActions(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-hover)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Classify with AI
                </button>
                {onExtractInvoice && (
                  <button onClick={() => { onExtractInvoice(); setShowActions(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-hover)] flex items-center gap-2">
                    <Receipt className="w-4 h-4" /> Extract Invoice
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between mb-2 gap-2">
            <div className="min-w-0">
              <p className="font-medium break-all">{email.from}</p>
              <p className="text-sm text-[var(--text-muted)]">To: {email.to.join(', ')}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm text-[var(--text-muted)]">{formatFullDate(email.receivedAt)}</p>
              {email.hasAttachments && (
                <p className="text-xs text-[var(--text-faint)] flex items-center justify-end gap-1 mt-1">
                  <Paperclip className="w-3 h-3" /> {formatSize(email.attachmentsTotalBytes || 0)}
                </p>
              )}
            </div>
          </div>

          {/* Classification badge with change option */}
          {email.classification && (() => {
            const emailMatch = email.from.match(/<([^>]+)>/) || [null, email.from];
            const senderEmail = emailMatch[1] || email.from;
            const senderDomain = senderEmail.split('@')[1] || '';
            const shortSender = senderEmail.length > 25 ? senderEmail.slice(0, 25) + '...' : senderEmail;

            return (
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <div className="relative">
                    <button onClick={() => { setShowCategoryPicker(!showCategoryPicker); setShowApplyToOthers(null); }}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                      <CategoryBadge category={email.classification.category} confidence={email.classification.confidence} />
                      <ChevronDown className="w-3 h-3 text-[var(--text-faint)]" />
                    </button>
                    {showCategoryPicker && onReclassify && (
                      <div className="absolute left-0 top-full mt-1 w-52 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                        <p className="px-3 py-1.5 text-xs text-[var(--text-faint)] uppercase">Change category</p>
                        {allCategories.map(cat => (
                          <button key={cat.id}
                            onClick={() => {
                              onReclassify(cat.id);
                              setShowCategoryPicker(false);
                              // Show "apply to others" panel after reclassifying
                              if (cat.id !== email.classification?.category) {
                                setShowApplyToOthers(cat.id);
                              }
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)] transition-colors ${
                              email.classification?.category === cat.id ? 'text-blue-400 font-medium' : ''
                            }`}>
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm flex-1">
                    <p className="text-[var(--text-muted)]">{email.classification.reasons.join(' ')}</p>
                    <p className="text-[var(--text-faint)] text-xs mt-1">Suggested: {email.classification.suggestedAction}</p>
                  </div>
                </div>

                {/* Apply to others panel - shows after reclassification */}
                {showApplyToOthers && onReclassify && (
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                    <span className="text-blue-300 text-xs">Also apply to:</span>
                    <button
                      onClick={() => { onReclassify(showApplyToOthers, 'sender'); setShowApplyToOthers(null); }}
                      className="px-2.5 py-1 text-xs rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                      All from {shortSender}
                    </button>
                    {senderDomain && (
                      <button
                        onClick={() => { onReclassify(showApplyToOthers, 'domain'); setShowApplyToOthers(null); }}
                        className="px-2.5 py-1 text-xs rounded-md bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors">
                        All from @{senderDomain}
                      </button>
                    )}
                    <button
                      onClick={() => setShowApplyToOthers(null)}
                      className="px-2 py-1 text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors ml-auto">
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {!email.classification && (
            <Button variant="secondary" size="sm" onClick={onClassify} loading={classifying} className="mb-4">
              <Sparkles className="w-4 h-4 mr-2" /> Classify Email
            </Button>
          )}

          {invoiceData && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
              <h3 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Invoice Data Extracted
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-[var(--text-muted)]">Vendor:</span> {invoiceData.vendor}</div>
                <div><span className="text-[var(--text-muted)]">Amount:</span> {invoiceData.amount} {invoiceData.currency}</div>
                {invoiceData.invoiceNumber && <div><span className="text-[var(--text-muted)]">Number:</span> {invoiceData.invoiceNumber}</div>}
                {invoiceData.invoiceDate && <div><span className="text-[var(--text-muted)]">Date:</span> {invoiceData.invoiceDate}</div>}
                {invoiceData.dueDate && <div><span className="text-[var(--text-muted)]">Due:</span> {invoiceData.dueDate}</div>}
                <div><span className="text-[var(--text-muted)]">Confidence:</span> {Math.round(invoiceData.confidence * 100)}%</div>
              </div>
            </div>
          )}
        </div>

        <div className="prose prose-invert max-w-none">
          {email.bodyHtml ? (
            <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} className="text-[var(--text-secondary)]" />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-[var(--text-secondary)]">
              {email.bodyText || email.snippet}
            </pre>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border)] p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Button variant="primary" size="sm" onClick={() => onReply()}>
            <Reply className="w-4 h-4 mr-2" /> Reply
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onReply()}>
            <Forward className="w-4 h-4 mr-2" /> Forward
          </Button>
          <Button variant="ghost" size="sm" onClick={onGenerateReplies} loading={generatingReplies}>
            <Sparkles className="w-4 h-4 mr-2" /> Smart Reply
          </Button>
          {onExtractInvoice && (
            <Button variant="ghost" size="sm" onClick={onExtractInvoice} loading={extractingInvoice}>
              <Receipt className="w-4 h-4 mr-2" /> Invoice
            </Button>
          )}
        </div>

        {smartReplies.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Quick Replies</p>
            <div className="flex flex-wrap gap-2">
              {smartReplies.map((reply) => (
                <button key={reply.id} onClick={() => onReply(reply.text)}
                  className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-secondary)] transition-colors">
                  {reply.text.length > 50 ? reply.text.slice(0, 50) + '...' : reply.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
