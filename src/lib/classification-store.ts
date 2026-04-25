import fs from 'fs';
import path from 'path';
import type { EmailClassification } from '@/types/email';

type ClassificationRecord = {
  classification: EmailClassification;
  updatedAt: string;
};

type StoreData = {
  // Key: `${accountEmail}:${emailId}`
  classifications: Record<string, ClassificationRecord>;
};

const STORE_PATH = path.join(process.cwd(), 'data', 'classifications.json');

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
    console.error('Failed to read classification store:', err);
  }
  return { classifications: {} };
}

function writeStore(data: StoreData): void {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function makeKey(accountEmail: string, emailId: string): string {
  return `${accountEmail}:${emailId}`;
}

export function getClassification(accountEmail: string, emailId: string): EmailClassification | null {
  const store = readStore();
  const record = store.classifications[makeKey(accountEmail, emailId)];
  return record?.classification || null;
}

export function getClassifications(accountEmail: string, emailIds: string[]): Record<string, EmailClassification> {
  const store = readStore();
  const result: Record<string, EmailClassification> = {};
  for (const id of emailIds) {
    const record = store.classifications[makeKey(accountEmail, id)];
    if (record) {
      result[id] = record.classification;
    }
  }
  return result;
}

export function saveClassification(accountEmail: string, emailId: string, classification: EmailClassification): void {
  const store = readStore();
  store.classifications[makeKey(accountEmail, emailId)] = {
    classification,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function saveClassifications(accountEmail: string, items: { emailId: string; classification: EmailClassification }[]): void {
  const store = readStore();
  const now = new Date().toISOString();
  for (const item of items) {
    store.classifications[makeKey(accountEmail, item.emailId)] = {
      classification: item.classification,
      updatedAt: now,
    };
  }
  writeStore(store);
}

export function deleteClassification(accountEmail: string, emailId: string): boolean {
  const store = readStore();
  const key = makeKey(accountEmail, emailId);
  if (store.classifications[key]) {
    delete store.classifications[key];
    writeStore(store);
    return true;
  }
  return false;
}
