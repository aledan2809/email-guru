import fs from 'fs';
import path from 'path';

// Store for Gmail watch subscriptions
// Tracks historyId per account so we can fetch changes since last notification

export type WatchSubscription = {
  email: string;
  historyId: string;
  expiration: string;
  createdAt: string;
  accessToken: string;
  refreshToken?: string;
};

type WatchStore = {
  subscriptions: WatchSubscription[];
};

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'watch-subscriptions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): WatchStore {
  ensureDataDir();
  if (!fs.existsSync(STORE_FILE)) {
    return { subscriptions: [] };
  }
  try {
    const content = fs.readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { subscriptions: [] };
  }
}

function writeStore(store: WatchStore): void {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

export function getSubscription(email: string): WatchSubscription | null {
  const store = readStore();
  return store.subscriptions.find(s => s.email === email) || null;
}

export function getAllSubscriptions(): WatchSubscription[] {
  const store = readStore();
  return store.subscriptions;
}

export function saveSubscription(subscription: WatchSubscription): void {
  const store = readStore();
  const idx = store.subscriptions.findIndex(s => s.email === subscription.email);
  if (idx >= 0) {
    store.subscriptions[idx] = subscription;
  } else {
    store.subscriptions.push(subscription);
  }
  writeStore(store);
}

export function updateHistoryId(email: string, historyId: string): void {
  const store = readStore();
  const idx = store.subscriptions.findIndex(s => s.email === email);
  if (idx >= 0) {
    store.subscriptions[idx].historyId = historyId;
    writeStore(store);
  }
}

export function removeSubscription(email: string): void {
  const store = readStore();
  store.subscriptions = store.subscriptions.filter(s => s.email !== email);
  writeStore(store);
}

// Store for new email notifications (to be consumed by clients via polling or SSE)
export type NewEmailNotification = {
  id: string;
  email: string;
  messageId: string;
  threadId: string;
  timestamp: string;
  classified?: boolean;
  category?: string;
};

type NotificationStore = {
  notifications: NewEmailNotification[];
};

const NOTIFICATION_FILE = path.join(DATA_DIR, 'new-email-notifications.json');

function readNotifications(): NotificationStore {
  ensureDataDir();
  if (!fs.existsSync(NOTIFICATION_FILE)) {
    return { notifications: [] };
  }
  try {
    const content = fs.readFileSync(NOTIFICATION_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { notifications: [] };
  }
}

function writeNotifications(store: NotificationStore): void {
  ensureDataDir();
  fs.writeFileSync(NOTIFICATION_FILE, JSON.stringify(store, null, 2));
}

export function addNotification(notification: Omit<NewEmailNotification, 'id' | 'timestamp'>): NewEmailNotification {
  const store = readNotifications();
  const newNotification: NewEmailNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  store.notifications.push(newNotification);

  // Keep only last 100 notifications
  if (store.notifications.length > 100) {
    store.notifications = store.notifications.slice(-100);
  }

  writeNotifications(store);
  return newNotification;
}

export function getNotifications(email: string, since?: string): NewEmailNotification[] {
  const store = readNotifications();
  let notifications = store.notifications.filter(n => n.email === email);
  if (since) {
    const sinceDate = new Date(since);
    notifications = notifications.filter(n => new Date(n.timestamp) > sinceDate);
  }
  return notifications;
}

export function markNotificationClassified(notificationId: string, category: string): void {
  const store = readNotifications();
  const notification = store.notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.classified = true;
    notification.category = category;
    writeNotifications(store);
  }
}

export function clearNotifications(email: string): void {
  const store = readNotifications();
  store.notifications = store.notifications.filter(n => n.email !== email);
  writeNotifications(store);
}
