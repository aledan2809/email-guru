'use client';

import type { EmailCategory, CustomCategory } from '@/types/email';

const BUILTIN_COLORS: Record<string, string> = {
  'invoice': 'bg-green-600 text-green-100',
  'business-opportunity': 'bg-yellow-600 text-yellow-100',
  'client-communication': 'bg-blue-600 text-blue-100',
  'service-alert': 'bg-red-600 text-red-100',
  'spam': 'bg-gray-600 text-gray-100',
  'storage-review': 'bg-purple-600 text-purple-100',
  'other': 'bg-gray-600 text-gray-100',
};

const BUILTIN_LABELS: Record<string, string> = {
  'invoice': 'Invoice',
  'business-opportunity': 'Business',
  'client-communication': 'Client',
  'service-alert': 'Alert',
  'spam': 'Spam',
  'storage-review': 'Storage',
  'other': 'Other',
};

// Load custom categories from localStorage
function getCustomCategories(): CustomCategory[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('email_guru_custom_categories');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

interface BadgeProps {
  category: EmailCategory;
  confidence?: number;
}

export function CategoryBadge({ category, confidence }: BadgeProps) {
  const customCats = getCustomCategories();
  const custom = customCats.find(c => c.id === category);

  const colorClass = custom
    ? `${custom.color} text-white`
    : (BUILTIN_COLORS[category] || 'bg-gray-600 text-gray-100');

  const label = custom
    ? custom.name
    : (BUILTIN_LABELS[category] || category);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {label}
      {confidence !== undefined && (
        <span className="ml-1 opacity-75">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  );
}

interface LabelBadgeProps {
  label: string;
}

export function LabelBadge({ label }: LabelBadgeProps) {
  const colors: Record<string, string> = {
    'INBOX': 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    'SENT': 'bg-green-600/20 text-green-400 border-green-600/30',
    'STARRED': 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    'IMPORTANT': 'bg-red-600/20 text-red-400 border-red-600/30',
    'DRAFT': 'bg-gray-600/20 text-gray-400 border-gray-600/30',
    'TRASH': 'bg-gray-600/20 text-gray-400 border-gray-600/30',
    'SPAM': 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  };

  const color = colors[label] || 'bg-gray-600/20 text-gray-400 border-gray-600/30';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${color}`}>
      {label.replace('CATEGORY_', '').toLowerCase()}
    </span>
  );
}
