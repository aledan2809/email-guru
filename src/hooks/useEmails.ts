'use client';

import { useState, useCallback, useRef } from 'react';
import type { Email, EmailClassification, EmailCategory, EmailProvider as ProviderType, SmartReply } from '@/types/email';
import { applyRules, loadRules } from '@/lib/classification-rules';

function getAccountFromCookie(provider: ProviderType): string {
  if (typeof document === 'undefined') return '';
  const cookieName = provider === 'outlook' ? 'outlook_user' : 'gmail_user';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${cookieName}=`);
  if (parts.length === 2) {
    try {
      const raw = parts.pop()?.split(';').shift() || '';
      const user = JSON.parse(decodeURIComponent(raw));
      return user.email || '';
    } catch { return ''; }
  }
  return '';
}

export function useEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef<ProviderType>('gmail');
  const accountRef = useRef<string>('');
  const accountIdRef = useRef<string>(''); // For IMAP accounts (server-side ID)
  const nextPageTokenRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);

  const setProvider = useCallback((p: ProviderType, accountId?: string, accountEmail?: string) => {
    providerRef.current = p;
    accountIdRef.current = accountId || '';
    accountRef.current = accountEmail || getAccountFromCookie(p);
  }, []);

  // Load saved classifications from server and merge into emails
  const mergeClassifications = useCallback(async (emailList: Email[]) => {
    const account = accountRef.current || getAccountFromCookie(providerRef.current);
    accountRef.current = account;
    if (!account || emailList.length === 0) return emailList;

    try {
      // Use POST to avoid URL length limits with many email IDs
      const res = await fetch('/api/classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account,
          action: 'lookup',
          ids: emailList.map(e => e.id),
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        if (data && Object.keys(data).length > 0) {
          const restored = emailList.map(e => data[e.id] ? { ...e, classification: data[e.id] } : e);
          console.log(`[EmailGuru] Restored ${Object.keys(data).length}/${emailList.length} classifications from server`);
          return restored;
        }
      }
    } catch (err) {
      console.error('Failed to load classifications:', err);
    }
    return emailList;
  }, []);

  // Persist a classification to server
  const persistClassification = useCallback(async (emailId: string, classification: EmailClassification) => {
    const account = accountRef.current || getAccountFromCookie(providerRef.current);
    if (!account) return;
    try {
      await fetch('/api/classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, emailId, classification }),
      });
    } catch (err) {
      console.error('Failed to persist classification:', err);
    }
  }, []);

  const lastQueryRef = useRef<string>('');

  const fetchEmails = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    lastQueryRef.current = query || '';
    nextPageTokenRef.current = null;
    hasMoreRef.current = false;
    try {
      const provider = providerRef.current;
      const params = new URLSearchParams();
      params.set('provider', provider);
      if (query) params.set('q', query);
      if (provider === 'imap' && accountIdRef.current) {
        params.set('accountId', accountIdRef.current);
      }

      const url = provider === 'gmail'
        ? `/api/gmail/emails?${params}`
        : `/api/mail?${params}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'UNAUTHORIZED') {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error(data.error || 'Failed to fetch emails');
      }

      // Store pagination token
      nextPageTokenRef.current = data.data.nextPageToken || null;
      hasMoreRef.current = !!data.data.nextPageToken;

      // Merge server-side classifications
      const merged = await mergeClassifications(data.data.emails);
      setEmails(merged);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mergeClassifications]);

  // Load next page of emails (appends to existing)
  const fetchMoreEmails = useCallback(async (): Promise<boolean> => {
    if (!nextPageTokenRef.current || loadingMore) return false;
    setLoadingMore(true);
    try {
      const provider = providerRef.current;
      const params = new URLSearchParams();
      params.set('provider', provider);
      if (lastQueryRef.current) params.set('q', lastQueryRef.current);
      params.set('pageToken', nextPageTokenRef.current);
      if (provider === 'imap' && accountIdRef.current) {
        params.set('accountId', accountIdRef.current);
      }

      const url = provider === 'gmail'
        ? `/api/gmail/emails?${params}`
        : `/api/mail?${params}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) return false;

      nextPageTokenRef.current = data.data.nextPageToken || null;
      hasMoreRef.current = !!data.data.nextPageToken;

      const merged = await mergeClassifications(data.data.emails);
      // Apply rules client-side immediately to new emails (free, no AI)
      const rules = loadRules();
      const withRules = merged.map(e => {
        if (e.classification) return e;
        const ruleResult = applyRules(e, rules);
        if (ruleResult) {
          persistClassification(e.id, ruleResult);
          return { ...e, classification: ruleResult };
        }
        return e;
      });
      setEmails(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newEmails = withRules.filter(e => !existingIds.has(e.id));
        return [...prev, ...newEmails];
      });
      return withRules.length > 0;
    } catch {
      return false;
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, mergeClassifications]);

  const getEmail = useCallback(async (id: string): Promise<Email | null> => {
    try {
      const provider = providerRef.current;
      const url = provider === 'gmail'
        ? `/api/gmail/emails?id=${id}`
        : `/api/mail?provider=${provider}&id=${id}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch email');
      }

      return data.data;
    } catch (err) {
      console.error('Error fetching email:', err);
      return null;
    }
  }, []);

  const sendEmail = useCallback(async (
    to: string[],
    subject: string,
    body: string,
    replyToId?: string
  ) => {
    const provider = providerRef.current;

    if (provider === 'gmail') {
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, replyToId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send email');
      return data;
    }

    // Use unified API for other providers
    const response = await fetch('/api/mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, action: 'send', to, subject, body, replyToId, accountId: accountIdRef.current }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send email');
    return data;
  }, []);

  const performAction = useCallback(async (
    action: 'markRead' | 'archive' | 'delete' | 'star',
    emailId: string,
    starred?: boolean
  ) => {
    const provider = providerRef.current;

    if (provider === 'gmail') {
      const response = await fetch('/api/gmail/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, emailId, starred }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action failed');
    } else {
      const response = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, action, emailId, starred, accountId: accountIdRef.current }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action failed');
    }

    setEmails((prev) =>
      prev.map((email) => {
        if (email.id !== emailId) return email;

        switch (action) {
          case 'markRead':
            return { ...email, isRead: true };
          case 'star':
            return { ...email, isStarred: starred ?? true };
          case 'archive':
          case 'delete':
            return email;
          default:
            return email;
        }
      }).filter((email) => {
        if (email.id === emailId && (action === 'archive' || action === 'delete')) {
          return false;
        }
        return true;
      })
    );
  }, []);

  const syncGmailLabel = useCallback(async (emailId: string, category: string) => {
    // Only sync labels for Gmail provider
    if (providerRef.current !== 'gmail') return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('email_guru_gmail_sync') !== 'true') return;

    const builtinLabels: Record<string, string> = {
      'invoice': 'EmailGuru/Invoice',
      'business-opportunity': 'EmailGuru/Business',
      'client-communication': 'EmailGuru/Client',
      'service-alert': 'EmailGuru/Alert',
      'spam': 'EmailGuru/Spam',
      'storage-review': 'EmailGuru/Storage',
      'other': 'EmailGuru/Other',
    };

    let labelName = builtinLabels[category];

    if (!labelName) {
      try {
        const customCats = JSON.parse(localStorage.getItem('email_guru_custom_categories') || '[]');
        const custom = customCats.find((c: { id: string }) => c.id === category);
        if (custom?.gmailLabel) labelName = custom.gmailLabel;
      } catch {}
    }

    if (!labelName) return;

    try {
      await fetch('/api/gmail/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, labelName }),
      });
    } catch (err) {
      console.error('Gmail label sync failed:', err);
    }
  }, []);

  const getCustomCats = useCallback(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('email_guru_custom_categories') || '[]')
        .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
    } catch { return []; }
  }, []);

  const getUserPrefs = useCallback(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('email_guru_user_prefs') || '[]');
    } catch { return []; }
  }, []);

  const BUILTIN_CATS = ['invoice', 'business-opportunity', 'client-communication', 'service-alert', 'spam', 'storage-review', 'other'];
  const AUTO_COLORS = [
    'bg-pink-500', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500',
    'bg-lime-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
    'bg-sky-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500',
  ];

  // Auto-create custom category if AI returns a new one
  const ensureCategory = useCallback((classification: EmailClassification) => {
    if (typeof window === 'undefined') return;
    const catId = classification.category;
    if (BUILTIN_CATS.includes(catId)) return;

    try {
      const stored = JSON.parse(localStorage.getItem('email_guru_custom_categories') || '[]');
      const exists = stored.find((c: { id: string }) => c.id === catId);
      if (exists) return;

      const catName = classification.categoryName || catId.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      stored.push({
        id: catId,
        name: catName,
        color: AUTO_COLORS[stored.length % AUTO_COLORS.length],
        gmailLabel: `EmailGuru/${catName}`,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('email_guru_custom_categories', JSON.stringify(stored));
    } catch {}
  }, []);

  const classifyEmail = useCallback(async (email: Email): Promise<EmailClassification> => {
    const response = await fetch('/api/ai/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, customCategories: getCustomCats(), userPrefs: getUserPrefs() }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Classification failed');
    }

    const classification = data.data.classification;

    setEmails((prev) =>
      prev.map((e) =>
        e.id === email.id ? { ...e, classification } : e
      )
    );

    ensureCategory(classification);
    persistClassification(email.id, classification);
    syncGmailLabel(email.id, classification.category);

    return classification;
  }, [syncGmailLabel, persistClassification, ensureCategory]);

  const generateSmartReplies = useCallback(async (email: Email): Promise<SmartReply[]> => {
    const response = await fetch('/api/ai/smart-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate replies');
    }

    return data.data.replies;
  }, []);

  // Apply rules client-side to a single email (returns classification or null)
  const tryRuleMatch = useCallback((email: Email): EmailClassification | null => {
    try {
      const rules = loadRules();
      return applyRules(email, rules);
    } catch { return null; }
  }, []);

  // Apply all rules to all loaded emails that don't have a classification yet
  // Returns count of newly classified emails
  const applyRulesToAll = useCallback((): number => {
    let count = 0;
    setEmails(prev => prev.map(email => {
      if (email.classification) return email;
      const ruleResult = tryRuleMatch(email);
      if (ruleResult) {
        count++;
        persistClassification(email.id, ruleResult);
        return { ...email, classification: ruleResult };
      }
      return email;
    }));
    return count;
  }, [tryRuleMatch, persistClassification]);

  // Abort controller for stopping classification
  const classifyAbortRef = useRef(false);

  const stopClassification = useCallback(() => {
    classifyAbortRef.current = true;
  }, []);

  const batchClassify = useCallback(async (emailsToClassify: Email[]): Promise<{ emailId: string; classification: EmailClassification }[]> => {
    classifyAbortRef.current = false;
    const unclassified = emailsToClassify.filter(e => !e.classification);
    if (unclassified.length === 0) return [];

    const sorted = [...unclassified].sort((a, b) =>
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );

    const allResults: { emailId: string; classification: EmailClassification }[] = [];

    for (const email of sorted) {
      // Check abort
      if (classifyAbortRef.current) break;

      try {
        // 1. Try client-side rules first (zero AI cost)
        const ruleResult = tryRuleMatch(email);
        if (ruleResult) {
          allResults.push({ emailId: email.id, classification: ruleResult });
          setEmails((prev) =>
            prev.map((e) => e.id === email.id ? { ...e, classification: ruleResult } : e)
          );
          ensureCategory(ruleResult);
          persistClassification(email.id, ruleResult);
          syncGmailLabel(email.id, ruleResult.category);
          // No delay needed for rule-based (instant)
          continue;
        }

        // 2. No rule matched - call AI
        const response = await fetch('/api/ai/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, customCategories: getCustomCats(), userPrefs: getUserPrefs() }),
        });

        const data = await response.json();
        if (response.ok && data.data?.classification) {
          const classification = data.data.classification;
          allResults.push({ emailId: email.id, classification });

          setEmails((prev) =>
            prev.map((e) =>
              e.id === email.id ? { ...e, classification } : e
            )
          );

          ensureCategory(classification);
          persistClassification(email.id, classification);
          syncGmailLabel(email.id, classification.category);
        }
      } catch (err) {
        console.error(`Classification failed for ${email.id}:`, err);
      }

      // Yield to UI between AI classifications
      await new Promise(r => setTimeout(r, 200));
    }

    return allResults;
  }, [syncGmailLabel, persistClassification, ensureCategory]);

  const getStats = useCallback(() => {
    const total = emails.length;
    const unread = emails.filter(e => !e.isRead).length;
    const classified = emails.filter(e => e.classification).length;
    const byCategory: Record<string, number> = {};

    emails.forEach(e => {
      if (e.classification) {
        byCategory[e.classification.category] = (byCategory[e.classification.category] || 0) + 1;
      }
    });

    return { total, unread, classified, byCategory };
  }, [emails]);

  const reclassifyEmail = useCallback((emailId: string, category: EmailCategory) => {
    const newClassification = {
      category,
      confidence: 1.0,
      reasons: ['Manually set by user'],
      suggestedAction: 'User-defined classification',
    };

    setEmails((prev) =>
      prev.map((e) =>
        e.id === emailId ? { ...e, classification: newClassification } : e
      )
    );

    persistClassification(emailId, newClassification);
    syncGmailLabel(emailId, category);

    return newClassification;
  }, [syncGmailLabel, persistClassification]);

  return {
    emails,
    loading,
    loadingMore,
    hasMore: hasMoreRef.current,
    error,
    setProvider,
    fetchEmails,
    fetchMoreEmails,
    getEmail,
    sendEmail,
    performAction,
    classifyEmail,
    reclassifyEmail,
    generateSmartReplies,
    batchClassify,
    stopClassification,
    applyRulesToAll,
    getStats,
  };
}
