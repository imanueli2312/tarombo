'use client';

import { useState, useEffect } from 'react';
import { t, type Locale } from '@/lib/i18n';

interface MarriagesViewProps {
  userId: string;
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export default function MarriagesView({ userId, locale, onNavigate }: MarriagesViewProps) {
  const [data, setData] = useState<{ marriages: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/marriages`);
        if (!res.ok) { setError('Not found'); return; }
        setData(await res.json());
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, textAlign: 'center', color: '#bf5329' }}>{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-2">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('marriages', locale)}</h1>
        <button onClick={() => onNavigate('user', { userId })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
          ← {t('show_profile', locale)}
        </button>
      </div>

      {data.marriages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.marriages.map((m) => (
            <div key={m.id} className="silsilah-panel">
              <div className="silsilah-panel-body">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      <span style={{ fontSize: 11, color: '#999' }}>{t('husband', locale)}:</span>{' '}
                      <button onClick={() => onNavigate('user', { userId: m.husbandId })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                        {m.husband?.name || m.husband?.nickname || '-'}
                      </button>
                    </div>
                    <div style={{ fontWeight: 'bold' }}>
                      <span style={{ fontSize: 11, color: '#999' }}>{t('wife', locale)}:</span>{' '}
                      <button onClick={() => onNavigate('user', { userId: m.wifeId })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                        {m.wife?.name || m.wife?.nickname || '-'}
                      </button>
                    </div>
                  </div>
                </div>
                {m.marriageDate && (
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                    {t('marriage_date', locale)}: {m.marriageDate}
                  </div>
                )}
                {m.divorceDate && (
                  <div style={{ fontSize: 12, color: '#bf5329', marginBottom: 4 }}>
                    {t('divorce_date', locale)}: {m.divorceDate}
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                  {t('child_count', locale)}: {m.childCount}
                </div>
                <button
                  onClick={() => onNavigate('couple', { coupleId: m.id })}
                  className="btn-silsilah btn-silsilah-info btn-silsilah-sm"
                >
                  {t('couple_detail', locale)}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="silsilah-panel">
          <div className="silsilah-panel-body text-center" style={{ color: '#999' }}>
            {t('data_not_available', locale)}
          </div>
        </div>
      )}
    </div>
  );
}