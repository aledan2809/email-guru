'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

type HealthCheck = {
  service: string;
  status: string;
  checks: {
    google_client_id: boolean;
    google_client_secret: boolean;
    google_redirect_uri: string;
    anthropic_key: boolean;
  };
  setup_hint: string | null;
};

export default function SetupPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    }
    setLoading(false);
  };

  useEffect(() => { checkHealth(); }, []);

  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-gray-800/50">
      {ok ? (
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
      )}
      <span className={ok ? 'text-gray-200' : 'text-red-300'}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold">E-mail Guru Setup</h1>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Status Banner */}
        <div className={`p-4 rounded-xl border ${
          health?.status === 'ready'
            ? 'bg-green-900/20 border-green-700'
            : 'bg-yellow-900/20 border-yellow-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {loading ? 'Checking...' : health?.status === 'ready' ? 'All systems ready!' : 'Setup required'}
            </span>
            <button
              onClick={checkHealth}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Configuration Checks */}
        {health && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Configuration Status</h2>
            <div className="space-y-2">
              <Check ok={health.checks.google_client_id} label="Google OAuth Client ID" />
              <Check ok={health.checks.google_client_secret} label="Google OAuth Client Secret" />
              <Check ok={health.checks.anthropic_key} label="Anthropic API Key (for AI features)" />
              <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-gray-800/50">
                <span className="text-gray-400 text-sm">Redirect URI:</span>
                <code className="text-xs text-blue-300 bg-gray-800 px-2 py-1 rounded">
                  {health.checks.google_redirect_uri}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Setup Steps */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-medium mb-4">Setup Instructions</h2>
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="space-y-2">
              <h3 className="font-medium text-blue-400">Step 1: Google Cloud Console</h3>
              <ol className="text-sm text-gray-400 space-y-2 ml-4 list-decimal">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Google Cloud Console - Credentials <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Select or create a project</li>
                <li>Create OAuth 2.0 Client ID (Web application type)</li>
                <li>
                  Add <strong>Authorized redirect URI</strong>:
                  <code className="block mt-1 text-xs text-green-300 bg-gray-800 px-3 py-2 rounded">
                    {health?.checks.google_redirect_uri || 'http://localhost:3101/api/auth/callback/google'}
                  </code>
                </li>
                <li>Copy Client ID and Client Secret</li>
              </ol>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <h3 className="font-medium text-blue-400">Step 2: Enable Gmail API</h3>
              <ol className="text-sm text-gray-400 space-y-2 ml-4 list-decimal">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Gmail API page <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Click &ldquo;Enable&rdquo;</li>
              </ol>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <h3 className="font-medium text-blue-400">Step 3: Configure .env.local</h3>
              <p className="text-sm text-gray-400">
                Edit <code className="text-xs text-yellow-300 bg-gray-800 px-1 rounded">C:\Projects\E-mail Guru\.env.local</code>:
              </p>
              <pre className="text-xs bg-gray-800 p-3 rounded-lg text-gray-300 overflow-x-auto">
{`GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:3101/api/auth/callback/google
ANTHROPIC_API_KEY=sk-ant-...`}
              </pre>
            </div>

            {/* Step 4 */}
            <div className="space-y-2">
              <h3 className="font-medium text-blue-400">Step 4: Restart & Connect</h3>
              <p className="text-sm text-gray-400">
                After saving .env.local, restart the server (close &amp; reopen start_email_guru.bat),
                then click &ldquo;Connect with Gmail&rdquo; on the home page.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          {health?.status === 'ready' && (
            <Link
              href="/"
              className="flex-1 text-center px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
            >
              Connect with Gmail &rarr;
            </Link>
          )}
          <button
            onClick={checkHealth}
            className="flex-1 text-center px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
          >
            Re-check Configuration
          </button>
        </div>
      </main>
    </div>
  );
}
