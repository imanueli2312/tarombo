'use client';

import { useState } from 'react';
import { t, type Locale } from '@/lib/i18n';

interface LoginViewProps {
  locale: Locale;
  onLogin: (user: any) => void;
  onNavigate: (view: string) => void;
}

export default function LoginView({ locale, onLogin, onNavigate }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      onLogin(data.user);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 50px)' }}>
      <div className="silsilah-panel" style={{ width: '100%', maxWidth: 400 }}>
        <div className="silsilah-panel-heading text-center">
          {t('app_name', locale)}
        </div>
        <div className="silsilah-panel-body">
          <form onSubmit={handleSubmit}>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('email', locale)}</label>
              <input
                type="email"
                className="silsilah-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('password', locale)}</label>
              <input
                type="password"
                className="silsilah-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="silsilah-form-group" style={{ color: '#bf5329', fontSize: 13 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn-silsilah btn-silsilah-primary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Loading...' : t('login', locale)}
            </button>
          </form>
          <div className="text-center" style={{ marginTop: 15, fontSize: 13 }}>
            <span style={{ color: '#999' }}>{t('forgot_password', locale)}</span>
          </div>
          <div className="text-center" style={{ marginTop: 10, fontSize: 13 }}>
            {t('need_account', locale)}{' '}
            <button
              onClick={() => onNavigate('register')}
              className="btn-silsilah btn-silsilah-link btn-silsilah-xs"
              style={{ color: '#3097D1', background: 'none', padding: 0, border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}
            >
              {t('register', locale)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}