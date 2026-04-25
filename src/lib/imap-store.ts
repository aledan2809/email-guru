import fs from 'fs';
import path from 'path';
import { encryptPassword, decryptPassword } from './encryption';

export type ImapAccountConfig = {
  id: string;
  name: string;
  email: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  password: string; // Encrypted using AES-256-GCM
  createdAt: string;
};

type StoreData = {
  accounts: ImapAccountConfig[];
};

const STORE_PATH = path.join(process.cwd(), 'data', 'imap-accounts.json');

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStore(): StoreData {
  ensureDir();
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to read IMAP store:', err);
  }
  return { accounts: [] };
}

function writeStore(data: StoreData): void {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getImapAccounts(): ImapAccountConfig[] {
  const store = readStore();
  // Return accounts with decrypted passwords
  return store.accounts.map(account => ({
    ...account,
    password: decryptPassword(account.password)
  }));
}

export function getImapAccount(id: string): ImapAccountConfig | null {
  const store = readStore();
  const account = store.accounts.find(a => a.id === id) || null;
  if (!account) return null;

  // Return account with decrypted password
  return {
    ...account,
    password: decryptPassword(account.password)
  };
}

export function getImapAccountByEmail(email: string): ImapAccountConfig | null {
  const store = readStore();
  const account = store.accounts.find(a => a.email === email) || null;
  if (!account) return null;

  // Return account with decrypted password
  return {
    ...account,
    password: decryptPassword(account.password)
  };
}

export function addImapAccount(account: Omit<ImapAccountConfig, 'id' | 'createdAt'>): ImapAccountConfig {
  const store = readStore();
  const newAccount: ImapAccountConfig = {
    ...account,
    password: encryptPassword(account.password), // Encrypt password before storing
    id: `imap-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  store.accounts.push(newAccount);
  writeStore(store);

  // Return account with decrypted password for immediate use
  return {
    ...newAccount,
    password: decryptPassword(newAccount.password)
  };
}

export function removeImapAccount(id: string): boolean {
  const store = readStore();
  const filtered = store.accounts.filter(a => a.id !== id);
  if (filtered.length === store.accounts.length) return false;
  store.accounts = filtered;
  writeStore(store);
  return true;
}

export function updateImapAccount(id: string, updates: Partial<ImapAccountConfig>): ImapAccountConfig | null {
  const store = readStore();
  const index = store.accounts.findIndex(a => a.id === id);
  if (index === -1) return null;

  // Encrypt password if it's being updated
  const updatesWithEncryption = { ...updates };
  if (updatesWithEncryption.password) {
    updatesWithEncryption.password = encryptPassword(updatesWithEncryption.password);
  }

  store.accounts[index] = { ...store.accounts[index], ...updatesWithEncryption };
  writeStore(store);

  // Return account with decrypted password
  return {
    ...store.accounts[index],
    password: decryptPassword(store.accounts[index].password)
  };
}
