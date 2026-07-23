'use client';

import { useState } from 'react';
import { t, type Locale } from '@/lib/i18n';

interface ChangePasswordViewProps {
  locale: Locale;
  onNavigate: (view: string) => void;
}

export default function ChangePasswordView({ locale, onNavigate }: ChangePasswordViewProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          newPasswordConfirmation: confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
      setMessage('OK');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('change_password', locale)}</h1>
      </div>

      <div className="silsilah-panel" style={{ maxWidth: 450 }}>
        <div className="silsilah-panel-body">
          {message && <div style={{ color: '#2ab27b', marginBottom: 10 }}>{message}</div>}
          {error && <div style={{ color: '#bf5329', marginBottom: 10 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('old_password', locale)}</label>
              <input type="password" className="silsilah-input" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
            </div>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('new_password', locale)}</label>
              <input type="password" className="silsilah-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('new_password_confirmation', locale)}</label>
              <input type="password" className="silsilah-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" className="btn-silsilah btn-silsilah-primary" disabled={loading}>
              {loading ? 'Saving...' : t('save', locale)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}