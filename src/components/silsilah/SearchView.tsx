'use client';

import { useState, useEffect, useCallback } from 'react';
import { t, type Locale } from '@/lib/i18n';
import { computeAge, getGender } from '@/lib/auth';

interface User {
  id: string;
  nickname: string;
  name: string | null;
  genderId: number;
  fatherId: string | null;
  motherId: string | null;
  dob: string | null;
  yob: string | null;
  dod: string | null;
  yod: string | null;
}

interface SearchViewProps {
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export default function SearchView({ locale, onNavigate }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fatherNames, setFatherNames] = useState<Record<string, string>>({});
  const [motherNames, setMotherNames] = useState<Record<string, string>>({});

  const doSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      setUsers([]);
      setTotal(0);
      setTotalPages(0);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&page=${p}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 0);

      // Fetch parent names
      const fatherIds = [...new Set((data.users || []).map((u: User) => u.fatherId).filter(Boolean))] as string[];
      const motherIds = [...new Set((data.users || []).map((u: User) => u.motherId).filter(Boolean))] as string[];
      const allIds = [...new Set([...fatherIds, ...motherIds])];

      if (allIds.length > 0) {
        const nameMap: Record<string, string> = {};
        await Promise.all(allIds.map(async (id) => {
          try {
            const r = await fetch(`/api/users/${id}`);
            if (r.ok) {
              const d = await r.json();
              nameMap[id] = d.user?.name || d.user?.nickname || '';
            }
          } catch { /* skip */ }
        }));
        const fMap: Record<string, string> = {};
        const mMap: Record<string, string> = {};
        fatherIds.forEach((id) => { if (nameMap[id]) fMap[id] = nameMap[id]; });
        motherIds.forEach((id) => { if (nameMap[id]) mMap[id] = nameMap[id]; });
        setFatherNames(fMap);
        setMotherNames(mMap);
      }
    } catch { /* skip */ }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query, 1), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query, 1);
  };

  const handleReset = () => {
    setQuery('');
    setUsers([]);
    setTotal(0);
    setTotalPages(0);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    doSearch(query, newPage);
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('search_your_family', locale)}</h1>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          className="silsilah-input flex-1"
          style={{ minWidth: 200 }}
          placeholder={t('search_your_family', locale)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-silsilah btn-silsilah-primary">
          {t('search', locale)}
        </button>
        <button type="button" onClick={handleReset} className="btn-silsilah btn-silsilah-default">
          {t('reset', locale)}
        </button>
      </form>

      {loading && <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>}

      {!loading && users.length > 0 && (
        <>
          <div style={{ marginBottom: 10, fontSize: 13, color: '#999' }}>
            {total} {total === 1 ? t('user_found', locale) : t('users_found', locale)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {users.map((user) => {
              const age = computeAge(user);
              const gender = getGender(user.genderId, locale);
              return (
                <div key={user.id} className="user-card">
                  <div className="flex justify-center mb-3">
                    <div
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 36,
                        fontWeight: 'bold',
                        color: '#fff',
                        background: user.genderId === 1 ? '#3097D1' : '#e8829a',
                      }}
                    >
                      {gender}
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 2 }}>
                    {user.name || user.nickname}
                  </div>
                  {user.nickname !== user.name && user.name && (
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                      ({user.nickname})
                    </div>
                  )}
                  <div className="flex justify-center gap-2 mb-2">
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontSize: 11,
                        background: user.genderId === 1 ? '#d0ecf8' : '#fce4ec',
                        color: user.genderId === 1 ? '#3097D1' : '#c2185b',
                      }}
                    >
                      {gender}
                    </span>
                    {age && (
                      <span style={{ fontSize: 11, color: '#999' }}>
                        {age.years} {t('age_years', locale)}
                      </span>
                    )}
                  </div>
                  {user.fatherId && fatherNames[user.fatherId] && (
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {t('father', locale)}: {fatherNames[user.fatherId]}
                    </div>
                  )}
                  {user.motherId && motherNames[user.motherId] && (
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {t('mother', locale)}: {motherNames[user.motherId]}
                    </div>
                  )}
                  <div className="flex gap-1 justify-center mt-3">
                    <button
                      onClick={() => onNavigate('user', { userId: user.id })}
                      className="btn-silsilah btn-silsilah-info btn-silsilah-xs"
                    >
                      {t('show_profile', locale)}
                    </button>
                    <button
                      onClick={() => onNavigate('chart', { userId: user.id })}
                      className="btn-silsilah btn-silsilah-primary btn-silsilah-xs"
                    >
                      {t('show_family_chart', locale)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && query.trim() && users.length === 0 && (
        <div className="silsilah-panel">
          <div className="silsilah-panel-body text-center" style={{ color: '#999' }}>
            0 {t('user_found', locale)}
          </div>
        </div>
      )}

      {!loading && !query.trim() && (
        <div className="silsilah-panel">
          <div className="silsilah-panel-body text-center" style={{ color: '#999' }}>
            {t('search_your_family', locale)}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`btn-silsilah btn-silsilah-xs ${p === page ? 'btn-silsilah-primary' : 'btn-silsilah-default'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}