'use client';

import { useEffect, useState } from 'react';
import { Mail, Sparkles, Shield, Zap } from 'lucide-react';
import { getCookie } from '../lib/cookies';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const userCookie = getCookie('gmail_user');
    if (userCookie) {
      window.location.href = '/dashboard';
    } else {
      setChecking(false);
    }

    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        auth_denied: 'Authentication was denied',
        no_code: 'No authorization code received',
        no_token: 'Failed to get access token',
        auth_failed: 'Authentication failed',
      };
      setError(errorMessages[errorParam] || 'An error occurred');
    }
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/auth/google';
  };

  if (!mounted || checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-5xl font-bold mb-4">E-mail Guru</h1>
          <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto">
            AI-powered email management that automatically classifies, prioritizes, and
            suggests actions for your inbox.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Classification</h3>
            <p className="text-[var(--text-muted)]">
              Automatically categorizes emails into invoices, business opportunities,
              client communications, and more.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
            <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Replies</h3>
            <p className="text-[var(--text-muted)]">
              Generate intelligent reply suggestions in different tones - professional,
              friendly, or brief.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Spam Detection</h3>
            <p className="text-[var(--text-muted)]">
              Identifies spam and junk emails, suggests blocking senders and domains
              automatically.
            </p>
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-900/20 border border-red-800 rounded-lg text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="text-center">
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Connect with Gmail
          </a>
          <p className="mt-4 text-sm text-gray-500">
            We only request read and send permissions. Your data stays secure.
          </p>
          <p className="mt-6">
            <a href="/setup" className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-4">
              First time? Open Setup Guide
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
