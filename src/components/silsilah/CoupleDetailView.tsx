'use client';

import { useState, useEffect } from 'react';
import { t, type Locale } from '@/lib/i18n';
import { getGender } from '@/lib/auth';

interface CoupleDetailViewProps {
  coupleId: string;
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export default function CoupleDetailView({ coupleId, locale, onNavigate }: CoupleDetailViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/couples/${coupleId}`);
        if (!res.ok) { setError('Not found'); return; }
        setData(await res.json());
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [coupleId]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, textAlign: 'center', color: '#bf5329' }}>{error}</div>;
  if (!data) return null;

  const { husband, wife, marriageDate, divorceDate, children, grandchildren } = data;

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-2">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('couple_detail', locale)}</h1>
        <div className="flex gap-1">
          <button onClick={() => onNavigate('edit-couple', { coupleId })} className="btn-silsilah btn-silsilah-primary btn-silsilah-sm">
            {t('edit', locale)}
          </button>
          {husband && <button onClick={() => onNavigate('user', { userId: husband.id })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">← {t('husband', locale)}</button>}
          {wife && <button onClick={() => onNavigate('user', { userId: wife.id })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">← {t('wife', locale)}</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="silsilah-panel">
          <div className="silsilah-panel-heading">{t('couple_detail', locale)}</div>
          <div className="silsilah-panel-body">
            <table className="silsilah-table" style={{ marginBottom: 0 }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: 120 }}>{t('husband', locale)}</td>
                  <td>
                    {husband ? (
                      <button onClick={() => onNavigate('user', { userId: husband.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                        {husband.name || husband.nickname}
                      </button>
                    ) : '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>{t('wife', locale)}</td>
                  <td>
                    {wife ? (
                      <button onClick={() => onNavigate('user', { userId: wife.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                        {wife.name || wife.nickname}
                      </button>
                    ) : '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>{t('marriage_date', locale)}</td>
                  <td>{marriageDate || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>{t('divorce_date', locale)}</td>
                  <td>{divorceDate || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="silsilah-panel">
          <div className="silsilah-panel-heading">Statistics</div>
          <div className="silsilah-panel-body">
            <table className="silsilah-table" style={{ marginBottom: 0 }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: 160 }}>{t('child_count', locale)}</td>
                  <td>{children?.length || 0}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>{t('grand_child_count', locale)}</td>
                  <td>{grandchildren?.length || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Children */}
      <div className="silsilah-panel mt-4">
        <div className="silsilah-panel-heading">{t('childs', locale)} ({children?.length || 0})</div>
        <div className="silsilah-panel-body">
          {children && children.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {children.map((child: any) => (
                <div key={child.id} className="silsilah-list-group-item flex items-center justify-between">
                  <div>
                    <span style={{ fontSize: 11, color: '#999', marginRight: 4 }}>{getGender(child.genderId, locale)}</span>
                    <button onClick={() => onNavigate('user', { userId: child.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                      {child.name || child.nickname}
                    </button>
                  </div>
                  {child.dob && <span style={{ fontSize: 11, color: '#999' }}>{child.dob}</span>}
                </div>
              ))}
            </div>
          ) : <div style={{ color: '#999' }}>-</div>}
        </div>
      </div>

      {/* Grandchildren */}
      {grandchildren && grandchildren.length > 0 && (
        <div className="silsilah-panel mt-4">
          <div className="silsilah-panel-heading">{t('grand_child_count', locale)} ({grandchildren.length})</div>
          <div className="silsilah-panel-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {grandchildren.map((gc: any) => (
                <div key={gc.id} className="silsilah-list-group-item">
                  <span style={{ fontSize: 11, color: '#999', marginRight: 4 }}>{getGender(gc.genderId, locale)}</span>
                  <button onClick={() => onNavigate('user', { userId: gc.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                    {gc.name || gc.nickname}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}