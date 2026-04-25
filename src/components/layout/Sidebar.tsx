'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Inbox, Star, Send, FileText, Trash2, Archive, Tag, Settings, LogOut, PenSquare,
  ChevronDown, Mail, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CustomCategory, EmailAccount } from '@/types/email';

interface SidebarProps {
  currentFolder: string;
  onFolderChange: (folder: string) => void;
  onCompose: () => void;
  onLogout: () => void;
  user?: { email: string; name: string; picture?: string };
  unreadCount?: number;
  accounts?: EmailAccount[];
  activeAccountId?: string;
  onSwitchAccount?: (account: EmailAccount) => void;
  categoryCounts?: Record<string, number>;
}

const folders = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

const categories = [
  { id: 'invoice', label: 'Invoices', color: 'bg-green-500' },
  { id: 'business-opportunity', label: 'Business', color: 'bg-yellow-500' },
  { id: 'client-communication', label: 'Clients', color: 'bg-blue-500' },
  { id: 'service-alert', label: 'Alerts', color: 'bg-red-500' },
  { id: 'spam', label: 'Spam', color: 'bg-gray-500' },
];

const providerIcons: Record<string, string> = {
  gmail: '📧',
  outlook: '📨',
  imap: '📬',
};

function loadCustomCategories(): CustomCategory[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('email_guru_custom_categories');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function Sidebar({
  currentFolder, onFolderChange, onCompose, onLogout, user, unreadCount,
  accounts = [], activeAccountId, onSwitchAccount, categoryCounts = {},
}: SidebarProps) {
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  // Reload custom categories when categoryCounts change (AI may have created new ones)
  useEffect(() => { setCustomCats(loadCustomCategories()); }, [categoryCounts]);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const hasMultipleAccounts = accounts.length > 1;

  return (
    <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col h-screen sticky top-0">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-3">E-mail Guru</h1>

        {/* Account switcher */}
        {accounts.length > 0 && (
          <div className="relative mb-3">
            <button
              onClick={() => hasMultipleAccounts && setShowAccountMenu(!showAccountMenu)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] transition-colors ${
                hasMultipleAccounts ? 'hover:bg-[var(--bg-hover)] cursor-pointer' : 'cursor-default'
              }`}
            >
              {activeAccount?.picture ? (
                <img src={activeAccount.picture} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <span className="text-sm">{providerIcons[activeAccount?.provider || 'gmail']}</span>
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="truncate font-medium">{activeAccount?.email || user?.email}</p>
                <p className="text-xs text-[var(--text-muted)] capitalize">{activeAccount?.provider || 'gmail'}</p>
              </div>
              {hasMultipleAccounts && (
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} />
              )}
            </button>

            {showAccountMenu && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
                {accounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => {
                      onSwitchAccount?.(account);
                      setShowAccountMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] ${
                      account.id === activeAccountId ? 'bg-[var(--bg-tertiary)]' : ''
                    }`}
                  >
                    {account.picture ? (
                      <img src={account.picture} alt="" className="w-5 h-5 rounded-full" />
                    ) : (
                      <span className="text-sm">{providerIcons[account.provider]}</span>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className="truncate">{account.email}</p>
                      <p className="text-xs text-[var(--text-muted)] capitalize">{account.provider}</p>
                    </div>
                    {account.id === activeAccountId && (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </button>
                ))}
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-t border-[var(--border)]"
                  onClick={() => setShowAccountMenu(false)}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Account</span>
                </Link>
              </div>
            )}
          </div>
        )}

        <Button variant="primary" className="w-full" onClick={onCompose}>
          <PenSquare className="w-4 h-4 mr-2" /> Compose
        </Button>
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        <div className="py-2">
          {folders.map((folder) => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;
            return (
              <button key={folder.id} onClick={() => onFolderChange(folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}>
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{folder.label}</span>
                {folder.id === 'inbox' && unreadCount && unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="border-t border-[var(--border)] py-2">
          <p className="px-3 py-2 text-xs text-[var(--text-faint)] uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-3 h-3" /> Categories
          </p>
          {categories.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            return (
              <button key={cat.id} onClick={() => onFolderChange(`category:${cat.id}`)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] ${
                  currentFolder === `category:${cat.id}` ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : ''
                }`}>
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                <span className="flex-1 text-left">{cat.label}</span>
                {count > 0 && (
                  <span className="text-xs text-[var(--text-faint)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded-full">{count}</span>
                )}
              </button>
            );
          })}
          {customCats.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            return (
              <button key={cat.id} onClick={() => onFolderChange(`category:${cat.id}`)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] ${
                  currentFolder === `category:${cat.id}` ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : ''
                }`}>
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                <span className="flex-1 text-left">{cat.name}</span>
                {count > 0 && (
                  <span className="text-xs text-[var(--text-faint)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded-full">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm">
                {user.name?.[0] || user.email[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Link href="/settings" className="flex-1">
            <Button variant="ghost" size="sm" className="w-full">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
