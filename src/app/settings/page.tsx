'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Bell, Shield, Palette, HelpCircle,
  Keyboard, FileText, Filter, Clock, Plus, Trash2, Edit2,
  ToggleLeft, ToggleRight, Mail, ExternalLink, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { SHORTCUT_LABELS, type ShortcutAction } from '@/hooks/useKeyboardShortcuts';
import type { ClassificationRule, RuleCondition, EmailCategory, EmailTemplate, EmailAccount, CustomCategory } from '@/types/email';
import { loadRules, saveRules, addRule, deleteRule } from '@/lib/classification-rules';
import { getCookie } from '@/lib/cookies';

// ---- Custom categories helpers ----
const CATEGORY_COLORS = [
  'bg-pink-500', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500',
  'bg-lime-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
  'bg-sky-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500',
];

function loadCustomCategories(): CustomCategory[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('email_guru_custom_categories');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveCustomCategories(cats: CustomCategory[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('email_guru_custom_categories', JSON.stringify(cats));
  }
}

// Get all category options (built-in + custom)
function getAllCategories(customCats: CustomCategory[]): { id: string; name: string }[] {
  const builtIn = [
    { id: 'invoice', name: 'Invoice' },
    { id: 'business-opportunity', name: 'Business Opportunity' },
    { id: 'client-communication', name: 'Client Communication' },
    { id: 'service-alert', name: 'Service Alert' },
    { id: 'spam', name: 'Spam' },
    { id: 'storage-review', name: 'Storage Review' },
    { id: 'other', name: 'Other' },
  ];
  return [...builtIn, ...customCats.map(c => ({ id: c.id, name: c.name }))];
}

type UserInfo = { email: string; name: string; picture?: string };

const PROVIDER_ICONS: Record<string, { icon: string; color: string; name: string }> = {
  gmail: { icon: '📧', color: 'bg-red-500/20 text-red-400', name: 'Gmail' },
  outlook: { icon: '📨', color: 'bg-blue-500/20 text-blue-400', name: 'Outlook' },
  imap: { icon: '📩', color: 'bg-gray-500/20 text-gray-400', name: 'IMAP' },
};

// ---- Default email templates ----
const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-thank-you',
    name: 'Thank You',
    subject: 'Thank you',
    body: 'Thank you for your email. I appreciate your time and will get back to you shortly.',
    category: 'thank-you',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-meeting',
    name: 'Meeting Request',
    subject: 'Meeting Request',
    body: 'Hi,\n\nI would like to schedule a meeting to discuss this further. Please let me know your availability.\n\nBest regards',
    category: 'meeting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-followup',
    name: 'Follow Up',
    subject: 'Following up',
    body: 'Hi,\n\nI wanted to follow up on my previous email. Please let me know if you need any additional information.\n\nBest regards',
    category: 'followup',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function loadTemplates(): EmailTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  const stored = localStorage.getItem('email_guru_templates');
  if (stored) {
    try { return JSON.parse(stored); } catch { return DEFAULT_TEMPLATES; }
  }
  return DEFAULT_TEMPLATES;
}
function saveTemplates(templates: EmailTemplate[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('email_guru_templates', JSON.stringify(templates));
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState('account');
  const { theme, setTheme } = useTheme();

  // Classification rules state
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleField, setNewRuleField] = useState<RuleCondition['field']>('subject');
  const [newRuleOperator, setNewRuleOperator] = useState<RuleCondition['operator']>('contains');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<EmailCategory>('other');
  const [newRulePriority, setNewRulePriority] = useState(5);
  const [newRuleCustomCatName, setNewRuleCustomCatName] = useState('');

  // Email templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplCategory, setTplCategory] = useState<EmailTemplate['category']>('custom');

  // Custom categories state
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [newCatGmailLabel, setNewCatGmailLabel] = useState('');
  const [gmailSyncEnabled, setGmailSyncEnabled] = useState(false);

  // Scheduled jobs state
  const [jobs, setJobs] = useState<{ id: string; type: string; schedule: string; scheduleLabel: string; enabled: boolean; lastRun?: string; nextRun?: string }[]>([]);

  // Connected accounts state
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // IMAP form state
  const [showImapForm, setShowImapForm] = useState(false);
  const [imapSaving, setImapSaving] = useState(false);
  const [imapError, setImapError] = useState('');
  const [imapForm, setImapForm] = useState({
    name: '', email: '', username: '', password: '',
    imapHost: '', imapPort: '993', imapSecure: true,
    smtpHost: '', smtpPort: '587', smtpSecure: false,
    preset: 'custom',
  });

  const IMAP_PRESETS: Record<string, { imapHost: string; imapPort: string; smtpHost: string; smtpPort: string; imapSecure: boolean; smtpSecure: boolean }> = {
    yahoo: { imapHost: 'imap.mail.yahoo.com', imapPort: '993', smtpHost: 'smtp.mail.yahoo.com', smtpPort: '465', imapSecure: true, smtpSecure: true },
    aol: { imapHost: 'imap.aol.com', imapPort: '993', smtpHost: 'smtp.aol.com', smtpPort: '465', imapSecure: true, smtpSecure: true },
    icloud: { imapHost: 'imap.mail.me.com', imapPort: '993', smtpHost: 'smtp.mail.me.com', smtpPort: '587', imapSecure: true, smtpSecure: false },
    zoho: { imapHost: 'imap.zoho.com', imapPort: '993', smtpHost: 'smtp.zoho.com', smtpPort: '465', imapSecure: true, smtpSecure: true },
    custom: { imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '587', imapSecure: true, smtpSecure: false },
  };

  useEffect(() => {
    const userCookie = getCookie('gmail_user');
    if (userCookie) {
      try { setUser(JSON.parse(decodeURIComponent(userCookie))); } catch { router.push('/'); }
    } else { router.push('/'); }
  }, [router]);

  useEffect(() => {
    setRules(loadRules());
    setTemplates(loadTemplates());
    setCustomCats(loadCustomCategories());
    setGmailSyncEnabled(localStorage.getItem('email_guru_gmail_sync') === 'true');
    fetch('/api/scheduled-jobs').then(r => r.json()).then(d => {
      if (d.data) setJobs(d.data);
    }).catch(() => {});

    // Fetch connected accounts
    fetch('/api/accounts').then(r => r.json()).then(d => {
      if (d.data?.accounts) setAccounts(d.data.accounts);
    }).catch(() => {}).finally(() => setLoadingAccounts(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      // IMAP accounts use their own API
      if (accountId.startsWith('imap-')) {
        await handleRemoveImapAccount(accountId);
        return;
      }
      await fetch('/api/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      setAccounts(prev => prev.filter(a => a.id !== accountId));
    } catch (error) {
      console.error('Failed to remove account:', error);
    }
  };

  const handleConnectAccount = (provider: 'google' | 'outlook') => {
    window.location.href = `/api/auth/${provider}`;
  };

  const handleImapPreset = (preset: string) => {
    const p = IMAP_PRESETS[preset] || IMAP_PRESETS.custom;
    setImapForm(prev => ({ ...prev, preset, ...p }));
  };

  const handleAddImapAccount = async () => {
    if (!imapForm.email || !imapForm.imapHost || !imapForm.username || !imapForm.password) {
      setImapError('Please fill in all required fields.');
      return;
    }
    setImapSaving(true);
    setImapError('');
    try {
      const res = await fetch('/api/accounts/imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: imapForm.name || imapForm.email,
          email: imapForm.email,
          username: imapForm.username,
          password: imapForm.password,
          imapHost: imapForm.imapHost,
          imapPort: parseInt(imapForm.imapPort) || 993,
          imapSecure: imapForm.imapSecure,
          smtpHost: imapForm.smtpHost || imapForm.imapHost.replace('imap', 'smtp'),
          smtpPort: parseInt(imapForm.smtpPort) || 587,
          smtpSecure: imapForm.smtpSecure,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImapError(data.error || 'Failed to add account');
        return;
      }
      // Add to accounts list
      setAccounts(prev => [...prev, {
        id: data.data.id,
        email: data.data.email,
        provider: 'imap',
        name: data.data.name,
        isConnected: true,
        isPrimary: prev.length === 0,
      }]);
      setShowImapForm(false);
      setImapForm({ name: '', email: '', username: '', password: '', imapHost: '', imapPort: '993', imapSecure: true, smtpHost: '', smtpPort: '587', smtpSecure: false, preset: 'custom' });
    } catch (err) {
      setImapError('Connection failed. Check your credentials.');
    } finally {
      setImapSaving(false);
    }
  };

  const handleRemoveImapAccount = async (accountId: string) => {
    try {
      await fetch('/api/accounts/imap', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId }),
      });
      setAccounts(prev => prev.filter(a => a.id !== accountId));
    } catch (error) {
      console.error('Failed to remove IMAP account:', error);
    }
  };

  const handleAddRule = () => {
    if (!newRuleName.trim() || !newRuleValue.trim()) return;

    let category = newRuleCategory;

    // If "other" selected and custom name provided, create a new custom category on the fly
    if (newRuleCategory === 'other' && newRuleCustomCatName.trim()) {
      const catId = newRuleCustomCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      // Check if it already exists
      const exists = customCats.find(c => c.id === catId);
      if (!exists) {
        const newCat: CustomCategory = {
          id: catId,
          name: newRuleCustomCatName.trim(),
          color: CATEGORY_COLORS[customCats.length % CATEGORY_COLORS.length],
          gmailLabel: `EmailGuru/${newRuleCustomCatName.trim()}`,
          createdAt: new Date().toISOString(),
        };
        const updated = [...customCats, newCat];
        saveCustomCategories(updated);
        setCustomCats(updated);
      }
      category = catId;
    }

    addRule({
      name: newRuleName,
      enabled: true,
      priority: newRulePriority,
      conditions: [{ field: newRuleField, operator: newRuleOperator, value: newRuleValue, caseSensitive: false }],
      action: { type: 'classify', category },
    });
    setRules(loadRules());
    setShowAddRule(false);
    setNewRuleName('');
    setNewRuleValue('');
    setNewRuleCustomCatName('');
  };

  const handleDeleteRule = (id: string) => {
    deleteRule(id);
    setRules(loadRules());
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() } : r);
    saveRules(updated);
    setRules(updated);
  };

  const handleAddTemplate = () => {
    if (!tplName.trim() || !tplSubject.trim()) return;
    const newTpl: EmailTemplate = {
      id: `tpl-${Date.now()}`,
      name: tplName,
      subject: tplSubject,
      body: tplBody,
      category: tplCategory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...templates, newTpl];
    saveTemplates(updated);
    setTemplates(updated);
    setShowAddTemplate(false);
    setTplName('');
    setTplSubject('');
    setTplBody('');
  };

  const handleSaveTemplate = (id: string) => {
    const updated = templates.map(t =>
      t.id === id ? { ...t, name: tplName, subject: tplSubject, body: tplBody, category: tplCategory, updatedAt: new Date().toISOString() } : t
    );
    saveTemplates(updated);
    setTemplates(updated);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
  };

  const handleToggleJob = async (jobId: string) => {
    const res = await fetch('/api/scheduled-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', jobId }),
    });
    const data = await res.json();
    if (data.data) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, enabled: data.data.enabled } : j));
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const id = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const newCat: CustomCategory = {
      id,
      name: newCatName,
      color: newCatColor,
      gmailLabel: newCatGmailLabel.trim() || `EmailGuru/${newCatName}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...customCats, newCat];
    saveCustomCategories(updated);
    setCustomCats(updated);
    setShowAddCategory(false);
    setNewCatName('');
    setNewCatGmailLabel('');
  };

  const handleDeleteCategory = (id: string) => {
    const updated = customCats.filter(c => c.id !== id);
    saveCustomCategories(updated);
    setCustomCats(updated);
  };

  const handleToggleGmailSync = () => {
    const newVal = !gmailSyncEnabled;
    setGmailSyncEnabled(newVal);
    localStorage.setItem('email_guru_gmail_sync', String(newVal));
  };

  const allCategories = getAllCategories(customCats);

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'rules', label: 'Rules', icon: Filter },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
    { id: 'scheduled', label: 'Scheduled', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] p-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <div className="flex flex-col md:flex-row gap-6">
          <nav className="md:w-48 flex-shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex-1 min-w-0">
            {/* ---- ACCOUNT ---- */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                  <h2 className="text-lg font-medium mb-4">Current User</h2>
                  <div className="flex items-center gap-4">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl">
                        {user.name?.[0] || user.email[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-lg">{user.name}</p>
                      <p className="text-[var(--text-muted)]">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                  <h2 className="text-lg font-medium mb-4">Connected Email Accounts</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    Manage your connected email accounts. Add multiple accounts to manage all your emails in one place.
                  </p>

                  {loadingAccounts ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                    </div>
                  ) : (
                    <div className="space-y-3 mb-6">
                      {accounts.map((account) => {
                        const providerInfo = PROVIDER_ICONS[account.provider] || PROVIDER_ICONS.imap;
                        return (
                          <div key={account.id} className="flex items-center gap-4 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${providerInfo.color}`}>
                              {providerInfo.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{account.email}</p>
                                {account.isPrimary && (
                                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">Primary</span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-muted)]">{providerInfo.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {account.isConnected ? (
                                <span className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-red-500" title="Disconnected" />
                              )}
                              {!account.isPrimary && (
                                <button
                                  onClick={() => handleRemoveAccount(account.id)}
                                  className="p-2 hover:bg-red-500/20 rounded text-red-400"
                                  title="Remove account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {accounts.length === 0 && (
                        <p className="text-sm text-[var(--text-muted)] text-center py-4">No accounts connected.</p>
                      )}
                    </div>
                  )}

                  <div className="border-t border-[var(--border)] pt-4">
                    <p className="text-sm text-[var(--text-muted)] mb-3">Add another email account:</p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleConnectAccount('google')}
                        className="flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Add Gmail
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleConnectAccount('outlook')}
                        className="flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Add Outlook
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowImapForm(!showImapForm)}
                        className="flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        {showImapForm ? 'Cancel' : 'Add IMAP'}
                      </Button>
                    </div>

                    {/* IMAP Account Form */}
                    {showImapForm && (
                      <div className="mt-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border)] space-y-4">
                        <h3 className="font-medium text-sm">Add IMAP Account</h3>

                        {/* Preset selector */}
                        <div>
                          <label className="text-xs text-[var(--text-muted)] block mb-1">Provider Preset</label>
                          <div className="flex flex-wrap gap-2">
                            {['custom', 'yahoo', 'aol', 'icloud', 'zoho'].map(p => (
                              <button
                                key={p}
                                onClick={() => handleImapPreset(p)}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                  imapForm.preset === p
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">Display Name</label>
                            <Input
                              placeholder="My Yahoo Mail"
                              value={imapForm.name}
                              onChange={e => setImapForm(f => ({ ...f, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">Email Address *</label>
                            <Input
                              placeholder="user@example.com"
                              value={imapForm.email}
                              onChange={e => setImapForm(f => ({ ...f, email: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">Username *</label>
                            <Input
                              placeholder="user@example.com"
                              value={imapForm.username}
                              onChange={e => setImapForm(f => ({ ...f, username: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">Password / App Password *</label>
                            <Input
                              type="password"
                              placeholder="App-specific password"
                              value={imapForm.password}
                              onChange={e => setImapForm(f => ({ ...f, password: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">IMAP Server *</label>
                            <Input
                              placeholder="imap.example.com"
                              value={imapForm.imapHost}
                              onChange={e => setImapForm(f => ({ ...f, imapHost: e.target.value }))}
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-[var(--text-muted)] block mb-1">IMAP Port</label>
                              <Input
                                placeholder="993"
                                value={imapForm.imapPort}
                                onChange={e => setImapForm(f => ({ ...f, imapPort: e.target.value }))}
                              />
                            </div>
                            <div className="flex items-end pb-1">
                              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={imapForm.imapSecure}
                                  onChange={e => setImapForm(f => ({ ...f, imapSecure: e.target.checked }))}
                                  className="rounded"
                                />
                                SSL
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">SMTP Server</label>
                            <Input
                              placeholder="smtp.example.com"
                              value={imapForm.smtpHost}
                              onChange={e => setImapForm(f => ({ ...f, smtpHost: e.target.value }))}
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-[var(--text-muted)] block mb-1">SMTP Port</label>
                              <Input
                                placeholder="587"
                                value={imapForm.smtpPort}
                                onChange={e => setImapForm(f => ({ ...f, smtpPort: e.target.value }))}
                              />
                            </div>
                            <div className="flex items-end pb-1">
                              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={imapForm.smtpSecure}
                                  onChange={e => setImapForm(f => ({ ...f, smtpSecure: e.target.checked }))}
                                  className="rounded"
                                />
                                SSL
                              </label>
                            </div>
                          </div>
                        </div>

                        {imapError && (
                          <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">{imapError}</p>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setShowImapForm(false); setImapError(''); }}>
                            Cancel
                          </Button>
                          <Button variant="primary" size="sm" onClick={handleAddImapAccount} disabled={imapSaving}>
                            {imapSaving ? 'Testing connection...' : 'Connect IMAP Account'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                  <h2 className="text-lg font-medium mb-4 text-red-400">Danger Zone</h2>
                  <p className="text-[var(--text-muted)] text-sm mb-4">Sign out from all accounts and clear your session.</p>
                  <Button variant="danger" onClick={handleLogout}>Sign Out</Button>
                </div>
              </div>
            )}

            {/* ---- CATEGORIES ---- */}
            {activeTab === 'categories' && (
              <div className="space-y-4">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">Custom Categories</h2>
                    <Button variant="primary" size="sm" onClick={() => setShowAddCategory(!showAddCategory)}>
                      <Plus className="w-4 h-4 mr-1" /> New Category
                    </Button>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    Create custom categories beyond the 7 built-in ones. Each category can sync to a Gmail label.
                  </p>

                  {showAddCategory && (
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg mb-4 space-y-3">
                      <Input placeholder="Category name (e.g. Newsletters)" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-2">Color</label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORY_COLORS.map((c) => (
                            <button key={c} onClick={() => setNewCatColor(c)}
                              className={`w-8 h-8 rounded-full ${c} ${newCatColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-tertiary)]' : ''}`} />
                          ))}
                        </div>
                      </div>
                      <Input
                        placeholder={`Gmail label (default: EmailGuru/${newCatName || 'Name'})`}
                        value={newCatGmailLabel}
                        onChange={(e) => setNewCatGmailLabel(e.target.value)}
                      />
                      <p className="text-xs text-[var(--text-faint)]">
                        When an email is classified into this category, this Gmail label will be applied automatically.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={handleAddCategory}>Create</Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Built-in categories */}
                  <p className="text-xs text-[var(--text-faint)] uppercase mb-2">Built-in</p>
                  <div className="space-y-1 mb-4">
                    {[
                      { id: 'invoice', name: 'Invoice', color: 'bg-green-500' },
                      { id: 'business-opportunity', name: 'Business Opportunity', color: 'bg-yellow-500' },
                      { id: 'client-communication', name: 'Client Communication', color: 'bg-blue-500' },
                      { id: 'service-alert', name: 'Service Alert', color: 'bg-red-500' },
                      { id: 'spam', name: 'Spam', color: 'bg-gray-500' },
                      { id: 'storage-review', name: 'Storage Review', color: 'bg-purple-500' },
                      { id: 'other', name: 'Other', color: 'bg-gray-400' },
                    ].map((cat) => (
                      <div key={cat.id} className="flex items-center gap-3 p-2 rounded">
                        <span className={`w-3 h-3 rounded-full ${cat.color}`} />
                        <span className="text-sm">{cat.name}</span>
                        <span className="text-xs text-[var(--text-faint)] ml-auto">EmailGuru/{cat.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Custom categories */}
                  {customCats.length > 0 && (
                    <>
                      <p className="text-xs text-[var(--text-faint)] uppercase mb-2">Custom</p>
                      <div className="space-y-2">
                        {customCats.map((cat) => (
                          <div key={cat.id} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <span className={`w-3 h-3 rounded-full ${cat.color}`} />
                            <span className="text-sm font-medium">{cat.name}</span>
                            <span className="text-xs text-[var(--text-faint)] ml-auto mr-2">{cat.gmailLabel}</span>
                            <button onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1 hover:bg-red-500/20 rounded text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Gmail Sync toggle */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                  <h2 className="text-lg font-medium mb-4">Gmail Label Sync</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Auto-sync classifications to Gmail labels</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        When enabled, each classified email will get a Gmail label (e.g. EmailGuru/Invoice).
                        Labels are created automatically.
                      </p>
                    </div>
                    <button onClick={handleToggleGmailSync}>
                      {gmailSyncEnabled ? (
                        <ToggleRight className="w-8 h-8 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-[var(--text-faint)]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---- APPEARANCE ---- */}
            {activeTab === 'appearance' && (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-lg font-medium mb-4">Appearance</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">Theme</label>
                    <div className="flex gap-3">
                      {(['dark', 'light', 'system'] as Theme[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                            theme === t
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                          }`}
                        >
                          <div className={`w-full h-12 rounded mb-2 ${
                            t === 'dark' ? 'bg-gray-900' : t === 'light' ? 'bg-white border border-gray-200' : 'bg-gradient-to-r from-gray-900 to-white'
                          }`} />
                          <p className="text-sm font-medium capitalize">{t}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---- CLASSIFICATION RULES ---- */}
            {activeTab === 'rules' && (
              <div className="space-y-4">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">Classification Rules</h2>
                    <Button variant="primary" size="sm" onClick={() => setShowAddRule(!showAddRule)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Rule
                    </Button>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    Rules are evaluated before AI classification. Higher priority (lower number) rules run first.
                  </p>

                  {showAddRule && (
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg mb-4 space-y-3">
                      <Input placeholder="Rule name" value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select value={newRuleField} onChange={(e) => setNewRuleField(e.target.value as RuleCondition['field'])}
                          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]">
                          <option value="from">From</option>
                          <option value="to">To</option>
                          <option value="subject">Subject</option>
                          <option value="body">Body</option>
                          <option value="hasAttachments">Has Attachments</option>
                        </select>
                        <select value={newRuleOperator} onChange={(e) => setNewRuleOperator(e.target.value as RuleCondition['operator'])}
                          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]">
                          <option value="contains">Contains</option>
                          <option value="equals">Equals</option>
                          <option value="startsWith">Starts with</option>
                          <option value="endsWith">Ends with</option>
                          <option value="regex">Regex</option>
                        </select>
                        <Input placeholder="Value" value={newRuleValue} onChange={(e) => setNewRuleValue(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select value={newRuleCategory} onChange={(e) => { setNewRuleCategory(e.target.value as EmailCategory); if (e.target.value !== 'other') setNewRuleCustomCatName(''); }}
                          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]">
                          {allCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-[var(--text-muted)]">Priority:</label>
                          <input type="number" min={1} max={100} value={newRulePriority}
                            onChange={(e) => setNewRulePriority(parseInt(e.target.value) || 5)}
                            className="w-20 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" />
                        </div>
                      </div>
                      {newRuleCategory === 'other' && (
                        <div>
                          <Input
                            placeholder="Custom category name (e.g. Newsletters, Finance, Personal...)"
                            value={newRuleCustomCatName}
                            onChange={(e) => setNewRuleCustomCatName(e.target.value)}
                          />
                          <p className="text-xs text-[var(--text-faint)] mt-1">
                            Leave empty to use &quot;Other&quot;, or type a name to auto-create a new category.
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={handleAddRule}>Save Rule</Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddRule(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                        <button onClick={() => handleToggleRule(rule.id)} className="flex-shrink-0">
                          {rule.enabled ? (
                            <ToggleRight className="w-6 h-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-[var(--text-faint)]" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${!rule.enabled ? 'opacity-50' : ''}`}>{rule.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {rule.conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(' AND ')}
                            {' → '}{rule.action.category}
                          </p>
                        </div>
                        <span className="text-xs text-[var(--text-faint)]">P{rule.priority}</span>
                        <button onClick={() => handleDeleteRule(rule.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {rules.length === 0 && (
                      <p className="text-sm text-[var(--text-muted)] text-center py-4">No rules configured. Add one above.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ---- EMAIL TEMPLATES ---- */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">Email Templates</h2>
                    <Button variant="primary" size="sm" onClick={() => {
                      setShowAddTemplate(!showAddTemplate);
                      setEditingTemplate(null);
                      setTplName(''); setTplSubject(''); setTplBody(''); setTplCategory('custom');
                    }}>
                      <Plus className="w-4 h-4 mr-1" /> New Template
                    </Button>
                  </div>

                  {(showAddTemplate || editingTemplate) && (
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg mb-4 space-y-3">
                      <Input placeholder="Template name" value={tplName} onChange={(e) => setTplName(e.target.value)} />
                      <Input placeholder="Subject line" value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} />
                      <textarea
                        placeholder="Email body..."
                        value={tplBody}
                        onChange={(e) => setTplBody(e.target.value)}
                        className="w-full h-32 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-faint)] resize-none"
                      />
                      <select value={tplCategory} onChange={(e) => setTplCategory(e.target.value as EmailTemplate['category'])}
                        className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]">
                        <option value="reply">Reply</option>
                        <option value="followup">Follow Up</option>
                        <option value="meeting">Meeting</option>
                        <option value="thank-you">Thank You</option>
                        <option value="custom">Custom</option>
                      </select>
                      <div className="flex gap-2">
                        {editingTemplate ? (
                          <Button variant="primary" size="sm" onClick={() => handleSaveTemplate(editingTemplate)}>Update</Button>
                        ) : (
                          <Button variant="primary" size="sm" onClick={handleAddTemplate}>Save</Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { setShowAddTemplate(false); setEditingTemplate(null); }}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{tpl.name}</p>
                          <div className="flex gap-1">
                            <button onClick={() => {
                              setEditingTemplate(tpl.id);
                              setShowAddTemplate(false);
                              setTplName(tpl.name); setTplSubject(tpl.subject); setTplBody(tpl.body); setTplCategory(tpl.category);
                            }} className="p-1 hover:bg-[var(--bg-hover)] rounded">
                              <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            </button>
                            <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">Subject: {tpl.subject}</p>
                        <p className="text-xs text-[var(--text-faint)] mt-1 truncate">{tpl.body}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">{tpl.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---- KEYBOARD SHORTCUTS ---- */}
            {activeTab === 'shortcuts' && (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-lg font-medium mb-4">Keyboard Shortcuts</h2>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Use these shortcuts anywhere in the dashboard (not while typing in fields).
                </p>
                <div className="space-y-2">
                  {(Object.entries(SHORTCUT_LABELS) as [ShortcutAction, { key: string; label: string }][]).map(([, { key, label }]) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                      <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-xs font-mono">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- SCHEDULED JOBS ---- */}
            {activeTab === 'scheduled' && (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-lg font-medium mb-4">Scheduled Processing</h2>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Automatic email processing jobs that run in the background.
                </p>
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-center gap-4 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                      <button onClick={() => handleToggleJob(job.id)}>
                        {job.enabled ? (
                          <ToggleRight className="w-6 h-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-[var(--text-faint)]" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className="font-medium text-sm capitalize">{job.type.replace('-', ' ')}</p>
                        <p className="text-xs text-[var(--text-muted)]">{job.scheduleLabel || job.schedule}</p>
                      </div>
                      <div className="text-right text-xs text-[var(--text-faint)]">
                        {job.lastRun && <p>Last: {new Date(job.lastRun).toLocaleTimeString()}</p>}
                        {job.nextRun && <p>Next: {new Date(job.nextRun).toLocaleTimeString()}</p>}
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">Loading scheduled jobs...</p>
                  )}
                </div>
              </div>
            )}

            {/* ---- NOTIFICATIONS ---- */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                  <h2 className="text-lg font-medium mb-4">Notification Settings</h2>
                  <div className="space-y-4">
                    {['Email classification alerts', 'Smart reply suggestions', 'Important email notifications'].map((label) => (
                      <label key={label} className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">{label}</span>
                        <input type="checkbox" className="w-5 h-5 rounded bg-[var(--bg-tertiary)] border-[var(--border)]" defaultChecked />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                  <h2 className="text-lg font-medium mb-4">Real-time Email Notifications</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    Enable Gmail push notifications to receive instant alerts when new emails arrive.
                    This requires Google Cloud Pub/Sub configuration.
                  </p>
                  <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">Gmail Push Notifications</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Requires GMAIL_PUBSUB_TOPIC environment variable
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                        Configure in .env
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-faint)]">
                      Set <code className="bg-[var(--bg-secondary)] px-1 py-0.5 rounded">GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT/topics/YOUR_TOPIC</code> and
                      configure your Pub/Sub subscription to push to <code className="bg-[var(--bg-secondary)] px-1 py-0.5 rounded">/api/webhook/gmail</code>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ---- PRIVACY ---- */}
            {activeTab === 'privacy' && (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-lg font-medium mb-4">Privacy & Security</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                    <h3 className="font-medium mb-2">Data Processing</h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      E-mail Guru uses AI to classify your emails and generate smart replies.
                      Your email content is processed securely and not stored beyond the current session.
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                    <h3 className="font-medium mb-2">Gmail Permissions</h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      We request read, send, and modify permissions to provide full email management.
                      You can revoke access anytime in your Google Account settings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ---- HELP ---- */}
            {activeTab === 'help' && (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-lg font-medium mb-4">Help & Support</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                    <h3 className="font-medium mb-2">About E-mail Guru</h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      AI-powered email management with automatic classification, smart replies, and invoice extraction.
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                    <h3 className="font-medium mb-2">Features</h3>
                    <ul className="text-sm text-[var(--text-muted)] list-disc list-inside space-y-1">
                      <li>AI-powered email classification (7 categories)</li>
                      <li>Smart reply suggestions (3 tones)</li>
                      <li>Custom classification rules</li>
                      <li>Email templates</li>
                      <li>Invoice extraction</li>
                      <li>Keyboard shortcuts</li>
                      <li>Scheduled email processing</li>
                      <li>Dark/Light/System themes</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                    <h3 className="font-medium mb-2">Version</h3>
                    <p className="text-sm text-[var(--text-muted)]">E-mail Guru v0.2.0</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
