'use client';

import { useState, useEffect } from 'react';
import { t, type Locale } from '@/lib/i18n';
import { getGender } from '@/lib/auth';

interface FamilyChartViewProps {
  userId: string;
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export default function FamilyChartView({ userId, locale, onNavigate }: FamilyChartViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/chart`);
        if (!res.ok) { setError('Not found'); return; }
        setData(await res.json());
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, textAlign: 'center', color: '#bf5329' }}>{error}</div>;
  if (!data) return null;

  const { user, paternalGrandfather, paternalGrandmother, maternalGrandfather, maternalGrandmother, father, mother, childrenWithGrandchildren, siblingsWithDesc } = data;

  const userLink = (u: any) => u ? (
    <button onClick={() => onNavigate('user', { userId: u.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 13 }}>
      {u.name || u.nickname}
    </button>
  ) : <span style={{ color: '#999' }}>-</span>;

  const genderBadge = (u: any) => u ? (
    <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>({getGender(u.genderId, locale)})</span>
  ) : null;

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-2">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('family_chart', locale)} - {user.name || user.nickname}</h1>
        <button onClick={() => onNavigate('user', { userId })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
          ← {t('show_profile', locale)}
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="silsilah-table silsilah-table-bordered silsilah-table-striped" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              <th colSpan={4} className="text-center" style={{ fontSize: 14 }}>
                {t('grand_father', locale)} & {t('grand_mother', locale)}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ width: '25%', textAlign: 'center' }}>{userLink(paternalGrandfather)}{genderBadge(paternalGrandfather)}</td>
              <td style={{ width: '25%', textAlign: 'center' }}>{userLink(paternalGrandmother)}{genderBadge(paternalGrandmother)}</td>
              <td style={{ width: '25%', textAlign: 'center' }}>{userLink(maternalGrandfather)}{genderBadge(maternalGrandfather)}</td>
              <td style={{ width: '25%', textAlign: 'center' }}>{userLink(maternalGrandmother)}{genderBadge(maternalGrandmother)}</td>
            </tr>
            <tr>
              <th colSpan={2} className="text-center" style={{ fontSize: 13 }}>
                {t('father', locale)} ({paternalGrandfather?.name || '...'})
              </th>
              <th colSpan={2} className="text-center" style={{ fontSize: 13 }}>
                {t('mother', locale)} ({maternalGrandfather?.name || '...'})
              </th>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'center' }}>{userLink(father)}{genderBadge(father)}</td>
              <td colSpan={2} style={{ textAlign: 'center' }}>{userLink(mother)}{genderBadge(mother)}</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 15, background: '#d0ecf8' }}>
                <button onClick={() => onNavigate('user', { userId: user.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 15, fontWeight: 'bold' }}>
                  {user.name || user.nickname}
                </button>
                <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>({getGender(user.genderId, locale)})</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Children & Grandchildren */}
      <div className="silsilah-panel mt-4">
        <div className="silsilah-panel-heading">{t('children_and_grand_children', locale)}</div>
        <div className="silsilah-panel-body">
          {childrenWithGrandchildren && childrenWithGrandchildren.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {childrenWithGrandchildren.map(({ child, grandchildren }: { child: any; grandchildren: any[] }) => (
                <div key={child.id} className="silsilah-panel">
                  <div className="silsilah-panel-body">
                    <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
                      {userLink(child)}{genderBadge(child)}
                    </div>
                    {grandchildren.length > 0 && (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ color: '#999', marginBottom: 3 }}>{t('childs', locale)}: {grandchildren.length}</div>
                        {grandchildren.map((gc: any) => (
                          <div key={gc.id} style={{ paddingLeft: 10 }}>
                            {userLink(gc)}{genderBadge(gc)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#999' }}>-</div>
          )}
        </div>
      </div>

      {/* Siblings section */}
      <div className="silsilah-panel mt-4">
        <div className="silsilah-panel-heading">{t('siblings_nieces', locale)}</div>
        <div className="silsilah-panel-body">
          {siblingsWithDesc && siblingsWithDesc.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {siblingsWithDesc.map(({ sibling, children: sibChildren, grandchildren: sibGrandchildren }: { sibling: any; children: any[]; grandchildren: any[] }) => (
                <div key={sibling.id} className="silsilah-panel">
                  <div className="silsilah-panel-body">
                    <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
                      {userLink(sibling)}{genderBadge(sibling)}
                    </div>
                    {sibChildren.length > 0 && (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ color: '#999', marginBottom: 3 }}>{t('childs', locale)}: {sibChildren.length}</div>
                        {sibChildren.map((sc: any) => (
                          <div key={sc.id} style={{ paddingLeft: 10 }}>
                            {userLink(sc)}{genderBadge(sc)}
                            {sibGrandchildren.filter((gc: any) => sc.id === (sc.genderId === 1 ? gc.fatherId : gc.motherId)).length > 0 && (
                              <div style={{ paddingLeft: 10, color: '#999' }}>
                                → {sibGrandchildren.filter((gc: any) => sc.id === (sc.genderId === 1 ? gc.fatherId : gc.motherId)).length} {t('grand_child_count', locale)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#999' }}>-</div>
          )}
        </div>
      </div>
    </div>
  );
}