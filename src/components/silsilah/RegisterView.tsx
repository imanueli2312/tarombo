'use client';

import { useState } from 'react';
import { t, type Locale } from '@/lib/i18n';

interface RegisterViewProps {
  locale: Locale;
  onRegister: (user: any) => void;
  onNavigate: (view: string) => void;
}

export default function RegisterView({ locale, onRegister, onNavigate }: RegisterViewProps) {
  const [nickname, setNickname] = useState('');
  const [name, setName] = useState('');
  const [genderId, setGenderId] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, name, genderId, email, password, passwordConfirmation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      onRegister(data.user);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 50px)', padding: 20 }}>
      <div className="silsilah-panel" style={{ width: '100%', maxWidth: 450 }}>
        <div className="silsilah-panel-heading text-center">
          {t('register', locale)}
        </div>
        <div className="silsilah-panel-body">
          <form onSubmit={handleSubmit}>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('nickname', locale)} *</label>
              <input
                type="text"
                className="silsilah-input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('name', locale)}</label>
              <input
                type="text"
                className="silsilah-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('gender', locale)} *</label>
              <div className="flex gap-4" style={{ marginTop: 5 }}>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={1}
                    checked={genderId === 1}
                    onChange={() => setGenderId(1)}
                  />
                  <span>{t('male', locale)}</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={2}
                    checked={genderId === 2}
                    onChange={() => setGenderId(2)}
                  />
                  <span>{t('female', locale)}</span>
                </label>
              </div>
            </div>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('email', locale)}</label>
              <input
                type="email"
                className="silsilah-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('password', locale)} *</label>
              <input
                type="password"
                className="silsilah-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('password_confirmation', locale)} *</label>
              <input
                type="password"
                className="silsilah-input"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                minLength={6}
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
              {loading ? 'Loading...' : t('register', locale)}
            </button>
          </form>
          <div className="text-center" style={{ marginTop: 15, fontSize: 13 }}>
            {t('have_an_account', locale)}{' '}
            <button
              onClick={() => onNavigate('login')}
              style={{ color: '#3097D1', background: 'none', padding: 0, border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}
            >
              {t('login', locale)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}