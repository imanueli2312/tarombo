'use client';

import { useState, useEffect } from 'react';
import { t, type Locale } from '@/lib/i18n';

interface BirthdayViewProps {
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export default function BirthdayView({ locale }: BirthdayViewProps) {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/birthdays');
        if (res.ok) setBirthdays(await res.json());
      } catch { /* skip */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('upcoming', locale)} {t('birthday', locale)}</h1>
      </div>

      {birthdays.length > 0 ? (
        <div className="silsilah-panel">
          <table className="silsilah-table silsilah-table-bordered silsilah-table-striped" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('name', locale)}</th>
                <th>{t('dob', locale)}</th>
                <th>{t('remaining', locale)} ({t('days', locale)})</th>
                <th>{t('age', locale)}</th>
              </tr>
            </thead>
            <tbody>
              {birthdays.map((b, i) => (
                <tr key={b.id}>
                  <td>{i + 1}</td>
                  <td>{b.name || b.nickname}</td>
                  <td>{b.dob}</td>
                  <td>{b.daysRemaining}</td>
                  <td>{b.nextAge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="silsilah-panel">
          <div className="silsilah-panel-body text-center" style={{ color: '#999' }}>
            {t('no_upcoming', locale)}
          </div>
        </div>
      )}
    </div>
  );
}