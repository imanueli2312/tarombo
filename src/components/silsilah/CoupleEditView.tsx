'use client';

import { useState, useEffect } from 'react';
import { t, type Locale } from '@/lib/i18n';

interface CoupleEditViewProps {
  coupleId: string;
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export default function CoupleEditView({ coupleId, locale, onNavigate }: CoupleEditViewProps) {
  const [marriageDate, setMarriageDate] = useState('');
  const [divorceDate, setDivorceDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/couples/${coupleId}`);
        if (!res.ok) { setError('Not found'); return; }
        const data = await res.json();
        setMarriageDate(data.marriageDate || '');
        setDivorceDate(data.divorceDate || '');
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [coupleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/couples/${coupleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marriageDate: marriageDate || null, divorceDate: divorceDate || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Update failed');
        return;
      }
      setMessage(t('update', locale) + ' OK');
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (error && !marriageDate && !divorceDate) return <div style={{ padding: 20, textAlign: 'center', color: '#bf5329' }}>{error}</div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-2">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('edit_couple', locale)}</h1>
        <button onClick={() => onNavigate('couple', { coupleId })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
          ← {t('couple_detail', locale)}
        </button>
      </div>

      {message && <div style={{ color: '#2ab27b', marginBottom: 10 }}>{message}</div>}
      {error && <div style={{ color: '#bf5329', marginBottom: 10 }}>{error}</div>}

      <div className="silsilah-panel" style={{ maxWidth: 500 }}>
        <div className="silsilah-panel-body">
          <form onSubmit={handleSubmit}>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('marriage_date', locale)}</label>
              <input type="date" className="silsilah-input" value={marriageDate} onChange={e => setMarriageDate(e.target.value)} />
            </div>
            <div className="silsilah-form-group">
              <label className="silsilah-control-label">{t('divorce_date', locale)}</label>
              <input type="date" className="silsilah-input" value={divorceDate} onChange={e => setDivorceDate(e.target.value)} />
            </div>
            <button type="submit" className="btn-silsilah btn-silsilah-primary" disabled={saving}>
              {saving ? 'Saving...' : t('save', locale)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}