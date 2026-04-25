'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, RefreshCw, Sparkles, BarChart3, Receipt, Menu, Bell, Trash2, Filter, X } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { EmailList } from '@/components/email/EmailList';
import { EmailView } from '@/components/email/EmailView';
import { ComposeModal } from '@/components/email/ComposeModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useEmails } from '@/hooks/useEmails';
import { useTheme } from '@/hooks/useTheme';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNotifications } from '@/hooks/useNotifications';
import { getCookie } from '@/lib/cookies';
import type { Email, EmailAccount, SmartReply, InvoiceData, EmailTemplate } from '@/types/email';

type User = {
  email: string;
  name: string;
  picture?: string;
};

function loadTemplates(): EmailTemplate[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('email_guru_templates');
  if (stored) {
    try { return JSON.parse(stored); } catch { return []; }
  }
  return [];
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | undefined>();
  const [initialBody, setInitialBody] = useState<string | undefined>();
  const [initialSubject, setInitialSubject] = useState<string | undefined>();
  const [smartReplies, setSmartReplies] = useState<SmartReply[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [generatingReplies, setGeneratingReplies] = useState(false);
  const [batchClassifying, setBatchClassifying] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [extractingInvoice, setExtractingInvoice] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkFilter, setBulkFilter] = useState({
    category: '' as string,
    olderThan: '' as string,  // '1m', '3m', '6m', '1y'
    minSize: '' as string,    // '1mb', '2mb', '5mb', '10mb'
  });
  const searchRef = useRef<HTMLInputElement>(null);

  useTheme(); // Apply theme

  const {
    emails, loading, loadingMore, hasMore, setProvider, fetchEmails, fetchMoreEmails,
    sendEmail, performAction,
    classifyEmail, reclassifyEmail, generateSmartReplies, batchClassify,
    stopClassification, applyRulesToAll, getStats,
  } = useEmails();

  const { toasts, toast, dismissToast, ToastContainer } = useToast();
  const {
    notifications,
    unreadCount: notificationCount,
    markAsSeen,
    dismissNotification,
  } = useNotifications(mounted, 30000);

  // Show toast for new email notifications
  const lastNotificationCountRef = useRef(0);
  useEffect(() => {
    if (notifications.length > lastNotificationCountRef.current) {
      const newNotifications = notifications.slice(lastNotificationCountRef.current);
      for (const notification of newNotifications) {
        toast.email('New Email', `You have a new email`, {
          label: 'View',
          onClick: () => {
            loadEmails();
            dismissNotification(notification.id);
          },
        });
      }
    }
    lastNotificationCountRef.current = notifications.length;
  }, [notifications, toast, dismissNotification]);

  // Load accounts
  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.success && data.data.accounts.length > 0) {
        setAccounts(data.data.accounts);
        // Set active account to first (primary) if not set
        if (!activeAccountId) {
          const primary = data.data.accounts.find((a: EmailAccount) => a.isPrimary) || data.data.accounts[0];
          setActiveAccountId(primary.id);
          setProvider(primary.provider);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }, [activeAccountId, setProvider]);

  useEffect(() => {
    setMounted(true);
    // Check any user cookie for authentication
    const gmailUser = getCookie('gmail_user');
    const outlookUser = getCookie('outlook_user');

    if (gmailUser) {
      try { setUser(JSON.parse(decodeURIComponent(gmailUser))); } catch { /* ignore */ }
    } else if (outlookUser) {
      try { setUser(JSON.parse(decodeURIComponent(outlookUser))); } catch { /* ignore */ }
    } else {
      window.location.href = '/';
      return;
    }

    loadAccounts();
  }, []);

  useEffect(() => { setTemplates(loadTemplates()); }, []);

  const handleSwitchAccount = useCallback((account: EmailAccount) => {
    setActiveAccountId(account.id);
    // For IMAP, pass the account ID so the hook can include it in API calls
    setProvider(account.provider, account.id, account.email);
    setSelectedEmail(null);
    setCurrentFolder('inbox');

    // Update displayed user info
    setUser({
      email: account.email,
      name: account.name,
      picture: account.picture,
    });
  }, [setProvider]);

  const loadEmails = useCallback(() => {
    let query = '';
    if (currentFolder === 'inbox') query = 'in:inbox';
    else if (currentFolder === 'starred') query = 'is:starred';
    else if (currentFolder === 'sent') query = 'in:sent';
    else if (currentFolder === 'drafts') query = 'in:drafts';
    else if (currentFolder === 'trash') query = 'in:trash';
    else if (currentFolder.startsWith('category:')) query = 'in:inbox';
    if (searchQuery) query = `${query} ${searchQuery}`;
    fetchEmails(query).catch((err) => {
      if (err.message === 'UNAUTHORIZED') window.location.href = '/';
    });
  }, [currentFolder, searchQuery, fetchEmails]);

  useEffect(() => {
    if (user && activeAccountId) loadEmails();
  }, [user, activeAccountId, currentFolder, loadEmails]);

  // Refs that always have latest values (for async loops)
  const emailsRef = useRef(emails);
  emailsRef.current = emails;
  const batchClassifyRef = useRef(batchClassify);
  batchClassifyRef.current = batchClassify;
  const fetchMoreEmailsRef = useRef(fetchMoreEmails);
  fetchMoreEmailsRef.current = fetchMoreEmails;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  // Continuous classify loop
  const classifyStoppedRef = useRef(false);
  const classifyRunningRef = useRef(false);

  const startContinuousClassify = useCallback(() => {
    if (classifyRunningRef.current) return;
    classifyRunningRef.current = true;
    classifyStoppedRef.current = false;
    setBatchClassifying(true);

    const tick = async () => {
      if (classifyStoppedRef.current) {
        setBatchClassifying(false);
        classifyRunningRef.current = false;
        return;
      }

      // Always read from refs for latest state
      const currentEmails = emailsRef.current;
      const unclassified = currentEmails.filter(e => !e.classification);

      if (unclassified.length > 0) {
        await batchClassifyRef.current(currentEmails);
      } else if (hasMoreRef.current) {
        await fetchMoreEmailsRef.current();
        // Wait for state to settle after loading
        await new Promise(r => setTimeout(r, 500));
      } else {
        // All done
        console.log(`[EmailGuru] Classification complete: ${currentEmails.length} emails processed`);
        setBatchClassifying(false);
        classifyRunningRef.current = false;
        return;
      }

      // Schedule next tick
      if (!classifyStoppedRef.current) {
        setTimeout(tick, 300);
      } else {
        setBatchClassifying(false);
        classifyRunningRef.current = false;
      }
    };

    tick();
  }, []);

  // Auto-start after initial load (once)
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (emails.length === 0 || loading || autoStartedRef.current) return;
    autoStartedRef.current = true;
    const unclassified = emails.filter(e => !e.classification);
    if (unclassified.length === 0 && !hasMore) {
      console.log('[EmailGuru] All emails already classified, skipping auto-classify');
      return;
    }
    console.log(`[EmailGuru] Auto-starting: ${unclassified.length} unclassified / ${emails.length} total, hasMore=${hasMore}`);
    setTimeout(() => startContinuousClassify(), 1000);
  }, [emails.length, loading]);

  // Reset when folder/account changes
  useEffect(() => {
    classifyStoppedRef.current = true;
    stopClassification();
    classifyRunningRef.current = false;
    autoStartedRef.current = false;
  }, [currentFolder, activeAccountId]);

  const filteredEmails = useMemo(() =>
    currentFolder.startsWith('category:')
      ? emails.filter((e) => e.classification?.category === currentFolder.replace('category:', ''))
      : emails,
    [emails, currentFolder]
  );

  const selectedIndex = useMemo(() =>
    selectedEmail ? filteredEmails.findIndex(e => e.id === selectedEmail.id) : -1,
    [filteredEmails, selectedEmail]
  );

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const handleStar = async (emailId: string, starred: boolean) => {
    await performAction('star', emailId, starred);
  };

  const handleArchive = async () => {
    if (selectedEmail) {
      await performAction('archive', selectedEmail.id);
      setSelectedEmail(null);
    }
  };

  const handleDelete = async () => {
    if (selectedEmail) {
      await performAction('delete', selectedEmail.id);
      setSelectedEmail(null);
    }
  };

  const handleReply = (body?: string) => {
    setReplyTo(selectedEmail || undefined);
    setInitialBody(body);
    setInitialSubject(undefined);
    setComposeOpen(true);
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    setReplyTo(undefined);
    setInitialSubject(template.subject);
    setInitialBody(template.body);
    setComposeOpen(true);
    setShowTemplates(false);
  };

  const handleClassify = async () => {
    if (!selectedEmail) return;
    setClassifying(true);
    try {
      const classification = await classifyEmail(selectedEmail);
      setSelectedEmail((prev) => prev ? { ...prev, classification } : null);
    } catch (err) {
      console.error('Classification failed:', err);
    } finally {
      setClassifying(false);
    }
  };

  const handleGenerateReplies = async () => {
    if (!selectedEmail) return;
    setGeneratingReplies(true);
    try {
      const replies = await generateSmartReplies(selectedEmail);
      setSmartReplies(replies);
    } catch (err) {
      console.error('Failed to generate replies:', err);
    } finally {
      setGeneratingReplies(false);
    }
  };

  const handleExtractInvoice = async () => {
    if (!selectedEmail) return;
    setExtractingInvoice(true);
    try {
      const res = await fetch('/api/ai/extract-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedEmail }),
      });
      const data = await res.json();
      setInvoiceData(data.data || null);
    } catch (err) {
      console.error('Invoice extraction failed:', err);
    } finally {
      setExtractingInvoice(false);
    }
  };

  const handleBatchClassify = async () => {
    setBatchClassifying(true);
    try {
      await batchClassify(filteredEmails);
    } catch (err) {
      console.error('Batch classification failed:', err);
    } finally {
      setBatchClassifying(false);
    }
  };

  // Bulk delete filter matching
  const bulkMatchingEmails = useMemo(() => {
    if (!showBulkDelete) return [];
    return emails.filter(e => {
      // Category filter
      if (bulkFilter.category && e.classification?.category !== bulkFilter.category) return false;

      // Age filter
      if (bulkFilter.olderThan) {
        const now = Date.now();
        const emailDate = new Date(e.receivedAt).getTime();
        const ageMs = now - emailDate;
        const thresholds: Record<string, number> = {
          '1m': 30 * 24 * 3600000,
          '3m': 90 * 24 * 3600000,
          '6m': 180 * 24 * 3600000,
          '1y': 365 * 24 * 3600000,
        };
        if (ageMs < (thresholds[bulkFilter.olderThan] || 0)) return false;
      }

      // Size filter
      if (bulkFilter.minSize && e.attachmentsTotalBytes) {
        const thresholds: Record<string, number> = {
          '1mb': 1024 * 1024,
          '2mb': 2 * 1024 * 1024,
          '5mb': 5 * 1024 * 1024,
          '10mb': 10 * 1024 * 1024,
        };
        if (e.attachmentsTotalBytes < (thresholds[bulkFilter.minSize] || 0)) return false;
      } else if (bulkFilter.minSize && !e.attachmentsTotalBytes) {
        return false;
      }

      // At least one filter must be active
      return bulkFilter.category || bulkFilter.olderThan || bulkFilter.minSize;
    });
  }, [emails, bulkFilter, showBulkDelete]);

  const handleBulkDelete = async () => {
    if (bulkMatchingEmails.length === 0) return;
    if (!confirm(`Delete ${bulkMatchingEmails.length} emails? This cannot be undone.`)) return;

    setBulkDeleting(true);
    let deleted = 0;
    for (const email of bulkMatchingEmails) {
      try {
        await performAction('delete', email.id);
        deleted++;
      } catch (err) {
        console.error(`Failed to delete ${email.id}:`, err);
      }
      // Yield to UI
      if (deleted % 5 === 0) await new Promise(r => setTimeout(r, 100));
    }
    setBulkDeleting(false);
    setShowBulkDelete(false);
    toast.success('Bulk Delete', `${deleted} emails deleted`);
    loadEmails();
  };

  const handleSendEmail = async (to: string[], subject: string, body: string, replyToId?: string) => {
    await sendEmail(to, subject, body, replyToId);
    setComposeOpen(false);
    setReplyTo(undefined);
    setInitialBody(undefined);
    setInitialSubject(undefined);
  };

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    setSmartReplies([]);
    setInvoiceData(null);
    setShowMobileSidebar(false);
    if (!email.isRead) performAction('markRead', email.id);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    compose: () => { setReplyTo(undefined); setInitialBody(undefined); setComposeOpen(true); },
    refresh: loadEmails,
    search: () => searchRef.current?.focus(),
    nextEmail: () => {
      if (selectedIndex < filteredEmails.length - 1) {
        handleSelectEmail(filteredEmails[selectedIndex + 1]);
      }
    },
    prevEmail: () => {
      if (selectedIndex > 0) {
        handleSelectEmail(filteredEmails[selectedIndex - 1]);
      }
    },
    reply: () => handleReply(),
    archive: handleArchive,
    delete: handleDelete,
    star: () => {
      if (selectedEmail) handleStar(selectedEmail.id, !selectedEmail.isStarred);
    },
    escape: () => {
      if (composeOpen) setComposeOpen(false);
      else if (selectedEmail) setSelectedEmail(null);
      else if (showMobileSidebar) setShowMobileSidebar(false);
    },
    classify: handleClassify,
    smartReply: handleGenerateReplies,
  }, !composeOpen);

  const unreadCount = emails.filter((e) => !e.isRead).length;
  const stats = getStats();
  const unclassifiedCount = filteredEmails.filter(e => !e.classification).length;
  const classifiedCount = filteredEmails.length - unclassifiedCount;

  // Find the oldest classified email's date (= where classification has reached)
  const classificationProgress = useMemo(() => {
    const classified = filteredEmails
      .filter(e => e.classification)
      .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
    if (classified.length === 0) return null;
    // The oldest classified = how far back we've classified
    const oldest = classified[0];
    return oldest.receivedAt;
  }, [filteredEmails]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setShowMobileSidebar(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar overlay for mobile */}
      {showMobileSidebar && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setShowMobileSidebar(false)}>
          <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              currentFolder={currentFolder}
              onFolderChange={(folder) => { setCurrentFolder(folder); setSelectedEmail(null); setShowMobileSidebar(false); }}
              onCompose={() => { setReplyTo(undefined); setInitialBody(undefined); setComposeOpen(true); setShowMobileSidebar(false); }}
              onLogout={handleLogout}
              user={user}
              unreadCount={unreadCount}
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSwitchAccount={handleSwitchAccount}
              categoryCounts={stats.byCategory}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar
          currentFolder={currentFolder}
          onFolderChange={(folder) => { setCurrentFolder(folder); setSelectedEmail(null); }}
          onCompose={() => { setReplyTo(undefined); setInitialBody(undefined); setComposeOpen(true); }}
          onLogout={handleLogout}
          user={user}
          unreadCount={unreadCount}
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSwitchAccount={handleSwitchAccount}
          categoryCounts={stats.byCategory}
        />
      </div>

      <main className="flex-1 flex min-w-0">
        {/* Email list - hide on mobile when email selected */}
        <div className={`${selectedEmail ? 'hidden md:flex md:w-96' : 'flex-1'} border-r border-[var(--border)] flex flex-col`}>
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 ml-10 md:ml-0">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
                <Input
                  ref={searchRef}
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadEmails()}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={loadEmails} disabled={loading} title="Refresh">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleBatchClassify}
                  disabled={batchClassifying || unclassifiedCount === 0}
                  title={`Classify ${unclassifiedCount} unclassified emails`}>
                  <Sparkles className={`w-4 h-4 ${batchClassifying ? 'animate-pulse text-yellow-400' : ''}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowStats(!showStats)} title="Statistics">
                  <BarChart3 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowBulkDelete(!showBulkDelete)} title="Bulk Delete Filters">
                  <Filter className={`w-4 h-4 ${showBulkDelete ? 'text-red-400' : ''}`} />
                </Button>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAsSeen}
                    title={notificationCount > 0 ? `${notificationCount} new emails` : 'No new notifications'}
                  >
                    <Bell className={`w-4 h-4 ${notificationCount > 0 ? 'text-purple-400' : ''}`} />
                  </Button>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </div>
                {templates.length > 0 && (
                  <div className="relative">
                    <Button variant="ghost" size="sm" onClick={() => setShowTemplates(!showTemplates)} title="Templates">
                      <Receipt className="w-4 h-4" />
                    </Button>
                    {showTemplates && (
                      <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg z-20">
                        <p className="px-3 py-2 text-xs text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Templates</p>
                        {templates.map(tpl => (
                          <button key={tpl.id} onClick={() => handleUseTemplate(tpl)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)] transition-colors">
                            <p className="font-medium">{tpl.name}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{tpl.subject}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {showStats && (
              <div className="mt-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-[var(--text-muted)]">Total</p><p className="font-medium">{stats.total}</p></div>
                  <div><p className="text-[var(--text-muted)]">Unread</p><p className="text-blue-400 font-medium">{stats.unread}</p></div>
                  <div><p className="text-[var(--text-muted)]">Classified</p><p className="text-green-400 font-medium">{stats.classified}</p></div>
                  <div><p className="text-[var(--text-muted)]">Pending</p><p className="text-yellow-400 font-medium">{stats.total - stats.classified}</p></div>
                </div>
                {Object.keys(stats.byCategory).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)] uppercase mb-2">By Category</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.byCategory).map(([cat, count]) => (
                        <span key={cat} className="px-2 py-1 text-xs bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)]">
                          {cat}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bulk Delete Filter Panel */}
            {showBulkDelete && (
              <div className="mt-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-400" /> Bulk Delete Filters
                  </h3>
                  <button onClick={() => setShowBulkDelete(false)} className="text-[var(--text-faint)] hover:text-[var(--text-muted)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {/* Category filter */}
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Category</label>
                    <select
                      value={bulkFilter.category}
                      onChange={e => setBulkFilter(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-md text-[var(--text-primary)]"
                    >
                      <option value="">Any</option>
                      <option value="spam">Spam</option>
                      <option value="marketing">Marketing</option>
                      <option value="newsletter">Newsletter</option>
                      {Object.keys(stats.byCategory).filter(c => !['spam','marketing','newsletter'].includes(c)).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Age filter */}
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Older than</label>
                    <select
                      value={bulkFilter.olderThan}
                      onChange={e => setBulkFilter(f => ({ ...f, olderThan: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-md text-[var(--text-primary)]"
                    >
                      <option value="">Any age</option>
                      <option value="1m">1 month</option>
                      <option value="3m">3 months</option>
                      <option value="6m">6 months</option>
                      <option value="1y">1 year</option>
                    </select>
                  </div>

                  {/* Size filter */}
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Size larger than</label>
                    <select
                      value={bulkFilter.minSize}
                      onChange={e => setBulkFilter(f => ({ ...f, minSize: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-md text-[var(--text-primary)]"
                    >
                      <option value="">Any size</option>
                      <option value="1mb">&gt; 1 MB</option>
                      <option value="2mb">&gt; 2 MB</option>
                      <option value="5mb">&gt; 5 MB</option>
                      <option value="10mb">&gt; 10 MB</option>
                    </select>
                  </div>
                </div>

                {/* Results preview + action */}
                <div className="flex items-center justify-between pt-3 border-t border-red-500/10">
                  <p className="text-sm">
                    {bulkFilter.category || bulkFilter.olderThan || bulkFilter.minSize ? (
                      <span>
                        <span className="font-medium text-red-400">{bulkMatchingEmails.length}</span>
                        <span className="text-[var(--text-muted)]"> emails match{bulkMatchingEmails.length > 0 ? '' : ' (load more to find matches)'}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--text-faint)]">Select at least one filter</span>
                    )}
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkMatchingEmails.length === 0 || bulkDeleting}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {bulkDeleting ? 'Deleting...' : `Delete ${bulkMatchingEmails.length} emails`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Classification progress bar - sticky */}
          {filteredEmails.length > 0 && (
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] text-xs">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  batchClassifying ? 'bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-[var(--text-faint)]'
                }`} />
                <span className="text-[var(--text-muted)]">
                  {classifiedCount}/{filteredEmails.length} classified
                </span>
                {classificationProgress && (
                  <span className="text-[var(--text-faint)]">
                    &middot; reached {new Date(classificationProgress).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {hasMore && !batchClassifying && (
                  <span className="text-[var(--text-faint)]">&middot; more available</span>
                )}
              </div>
              {batchClassifying ? (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">{loadingMore ? 'Loading more...' : 'Classifying...'}</span>
                  <button
                    onClick={() => { classifyStoppedRef.current = true; stopClassification(); setBatchClassifying(false); classifyRunningRef.current = false; }}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                  >
                    Pause
                  </button>
                </div>
              ) : (classifiedCount < emails.length || hasMore) ? (
                <button
                  onClick={() => startContinuousClassify()}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                >
                  Resume
                </button>
              ) : null}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <EmailList emails={filteredEmails} selectedId={selectedEmail?.id}
              onSelect={handleSelectEmail} onStar={handleStar} loading={loading} />
          </div>
        </div>

        {/* Email view */}
        {selectedEmail && (
          <div className="flex-1 min-w-0">
            <EmailView
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
              onStar={(starred) => handleStar(selectedEmail.id, starred)}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onReply={handleReply}
              onClassify={handleClassify}
              onReclassify={(category, applyTo) => {
                if (!selectedEmail) return;
                const classification = reclassifyEmail(selectedEmail.id, category);
                setSelectedEmail(prev => prev ? { ...prev, classification } : null);

                // Extract sender info
                const emailMatch = selectedEmail.from.match(/<([^>]+)>/) || [null, selectedEmail.from];
                const senderEmail = emailMatch[1] || selectedEmail.from;
                const senderDomain = senderEmail.split('@')[1] || '';

                // Save a classification rule so AI learns from this action
                const ruleValue = applyTo === 'domain' ? senderDomain : senderEmail;
                const ruleField = applyTo === 'domain' ? 'from' : 'from';
                const ruleOp = applyTo === 'domain' ? 'contains' : 'contains';
                const matchLabel = applyTo === 'domain' ? `@${senderDomain}` : senderEmail;

                if (applyTo) {
                  // Auto-create a classification rule
                  try {
                    const stored = JSON.parse(localStorage.getItem('email_guru_rules') || '[]');
                    // Don't duplicate
                    const exists = stored.find((r: { name: string }) => r.name === `Auto: ${matchLabel} → ${category}`);
                    if (!exists) {
                      stored.push({
                        id: `rule-auto-${Date.now()}`,
                        name: `Auto: ${matchLabel} → ${category}`,
                        enabled: true,
                        priority: 0, // High priority - user rules first
                        conditions: [{ field: ruleField, operator: ruleOp, value: applyTo === 'domain' ? `@${ruleValue}` : ruleValue, caseSensitive: false }],
                        action: { type: 'classify', category },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      });
                      localStorage.setItem('email_guru_rules', JSON.stringify(stored));
                    }
                  } catch {}

                  // Apply rule to ALL loaded emails (including already classified ones from same sender)
                  // First: reclassify matching emails that already have a different category
                  let count = 0;
                  emails.forEach(e => {
                    if (e.id === selectedEmail.id) return;
                    const match = applyTo === 'domain'
                      ? e.from.includes(`@${senderDomain}`)
                      : e.from.includes(senderEmail);
                    if (match && e.classification?.category !== category) {
                      reclassifyEmail(e.id, category);
                      count++;
                    }
                  });

                  // Then: apply rules to any remaining unclassified emails
                  const ruleMatched = applyRulesToAll();
                  count += ruleMatched;

                  if (count > 0) {
                    toast.success('Reclassified', `${count + 1} emails from ${matchLabel} → ${category}`);
                  }
                }

                // Always save user preference for AI learning
                try {
                  const prefs = JSON.parse(localStorage.getItem('email_guru_user_prefs') || '[]');
                  prefs.push({
                    sender: senderEmail,
                    domain: senderDomain,
                    category,
                    scope: applyTo || 'single',
                    timestamp: new Date().toISOString(),
                  });
                  // Keep last 200 prefs
                  if (prefs.length > 200) prefs.splice(0, prefs.length - 200);
                  localStorage.setItem('email_guru_user_prefs', JSON.stringify(prefs));
                } catch {}
              }}
              onGenerateReplies={handleGenerateReplies}
              onExtractInvoice={handleExtractInvoice}
              smartReplies={smartReplies}
              classifying={classifying}
              generatingReplies={generatingReplies}
              invoiceData={invoiceData}
              extractingInvoice={extractingInvoice}
            />
          </div>
        )}
      </main>

      <ComposeModal
        isOpen={composeOpen}
        onClose={() => { setComposeOpen(false); setReplyTo(undefined); setInitialBody(undefined); setInitialSubject(undefined); }}
        onSend={handleSendEmail}
        replyTo={replyTo}
        initialBody={initialBody}
        initialSubject={initialSubject}
      />

      <ToastContainer />
    </div>
  );
}
