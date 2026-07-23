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
  parentId: string | null;
  dob: string | null;
  yob: string | null;
  dod: string | null;
  yod: string | null;
  birthOrder: number | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  photoPath: string | null;
  managerId: string | null;
}

interface UserProfileViewProps {
  userId: string;
  locale: Locale;
  isAuthenticated: boolean;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onRefresh?: () => void;
}

interface SelectUser {
  id: string;
  nickname: string;
  name: string | null;
}

export default function UserProfileView({ userId, locale, isAuthenticated, onNavigate, onRefresh }: UserProfileViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inline form states
  const [showSetFather, setShowSetFather] = useState(false);
  const [showSetMother, setShowSetMother] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddSpouse, setShowAddSpouse] = useState(false);
  const [selectUsers, setSelectUsers] = useState<SelectUser[]>([]);
  const [formMode, setFormMode] = useState<'select' | 'create'>('select');

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) {
        setError('User not found');
        return;
      }
      const result = await res.json();
      setData(result);
    } catch {
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const fetchSelectUsers = async (gender: 'male' | 'female') => {
    try {
      const res = await fetch(`/api/select/${gender === 'male' ? 'males' : 'females'}`);
      if (res.ok) {
        const users = await res.json();
        setSelectUsers(users);
      }
    } catch { /* skip */ }
  };

  const handleSetFatherSelect = () => {
    setFormMode('select');
    setShowSetFather(true);
    fetchSelectUsers('male');
  };

  const handleSetMotherSelect = () => {
    setFormMode('select');
    setShowSetMother(true);
    fetchSelectUsers('female');
  };

  const handleSubmitSetFather = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const existingUserId = (form.elements.namedItem('existingUserId') as HTMLSelectElement)?.value;
    const nickname = (form.elements.namedItem('nickname') as HTMLInputElement)?.value;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value;

    try {
      const body: any = {};
      if (formMode === 'select' && existingUserId) {
        body.existingUserId = existingUserId;
      } else if (formMode === 'create' && nickname) {
        body.nickname = nickname;
        body.name = name || null;
      } else return;

      const res = await fetch(`/api/family-actions/${userId}/set-father`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowSetFather(false);
        fetchUser();
        onRefresh?.();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed');
      }
    } catch { alert('Network error'); }
  };

  const handleSubmitSetMother = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const existingUserId = (form.elements.namedItem('existingUserId') as HTMLSelectElement)?.value;
    const nickname = (form.elements.namedItem('nickname') as HTMLInputElement)?.value;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value;

    try {
      const body: any = {};
      if (formMode === 'select' && existingUserId) {
        body.existingUserId = existingUserId;
      } else if (formMode === 'create' && nickname) {
        body.nickname = nickname;
        body.name = name || null;
      } else return;

      const res = await fetch(`/api/family-actions/${userId}/set-mother`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowSetMother(false);
        fetchUser();
        onRefresh?.();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed');
      }
    } catch { alert('Network error'); }
  };

  const handleSubmitAddChild = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nickname = (form.elements.namedItem('childNickname') as HTMLInputElement)?.value;
    const name = (form.elements.namedItem('childName') as HTMLInputElement)?.value;
    const genderId = parseInt((form.elements.namedItem('childGender') as HTMLSelectElement)?.value || '1', 10);

    if (!nickname) return;

    try {
      const res = await fetch(`/api/family-actions/${userId}/add-child`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, name, genderId }),
      });
      if (res.ok) {
        setShowAddChild(false);
        fetchUser();
        onRefresh?.();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed');
      }
    } catch { alert('Network error'); }
  };

  const handleSubmitAddSpouse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const existingUserId = (form.elements.namedItem('spouseExistingId') as HTMLSelectElement)?.value;
    const nickname = (form.elements.namedItem('spouseNickname') as HTMLInputElement)?.value;
    const name = (form.elements.namedItem('spouseName') as HTMLInputElement)?.value;

    try {
      const body: any = {};
      if (formMode === 'select' && existingUserId) {
        body.existingUserId = existingUserId;
      } else if (formMode === 'create' && nickname) {
        body.nickname = nickname;
        body.name = name || null;
      } else return;

      const res = await fetch(`/api/family-actions/${userId}/add-spouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowAddSpouse(false);
        fetchUser();
        onRefresh?.();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed');
      }
    } catch { alert('Network error'); }
  };

  const handleAddSpouseOpen = () => {
    const gender = data?.user?.genderId === 1 ? 'female' : 'male';
    setFormMode('select');
    setShowAddSpouse(true);
    fetchSelectUsers(gender === 'male' ? 'male' : 'female');
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, textAlign: 'center', color: '#bf5329' }}>{error} <button onClick={fetchUser} className="btn-silsilah btn-silsilah-sm btn-silsilah-default">{t('search', locale)}</button></div>;
  if (!data) return null;

  const { user, father, mother, parentCouple, children, marriages, siblings } = data;
  const age = computeAge(user);
  const gender = getGender(user.genderId, locale);
  const spouseLabel = user.genderId === 1 ? t('wifes', locale) : t('husbands', locale);
  const addSpouseLabel = user.genderId === 1 ? t('add_wife', locale) : t('add_husband', locale);

  const InlineSelectOrCreateForm = ({
    mode,
    onToggleMode,
    selectUsers: su,
    onSubmit,
    cancelAction,
    createGenderLabel,
  }: {
    mode: 'select' | 'create';
    onToggleMode: () => void;
    selectUsers: SelectUser[];
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    cancelAction: () => void;
    createGenderLabel: string;
  }) => (
    <form onSubmit={onSubmit} className="silsilah-panel" style={{ marginBottom: 10 }}>
      <div className="silsilah-panel-body">
        <div className="flex items-center gap-2 mb-2">
          <button type="button" onClick={onToggleMode} className={`btn-silsilah btn-silsilah-xs ${mode === 'select' ? 'btn-silsilah-primary' : 'btn-silsilah-default'}`}>
            {mode === 'select'
              ? (su[0]?.name ? (user.genderId === 1 ? t('select_from_existing_males', locale) : t('select_from_existing_females', locale)) : t('select_from_existing_males', locale))
              : t('enter_new_name', locale)}
          </button>
          <button type="button" onClick={cancelAction} className="btn-silsilah btn-silsilah-xs btn-silsilah-default">
            {t('cancel', locale)}
          </button>
        </div>
        {mode === 'select' && su.length > 0 ? (
          <div className="flex gap-2">
            <select name="existingUserId" className="silsilah-select flex-1">
              <option value="">--</option>
              {su.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.nickname}</option>
              ))}
            </select>
            <button type="submit" className="btn-silsilah btn-silsilah-primary btn-silsilah-sm">{t('save', locale)}</button>
          </div>
        ) : mode === 'select' ? (
          <div style={{ color: '#999', fontSize: 12 }}>No users found. Create new one.</div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <input name="nickname" className="silsilah-input" style={{ width: 120 }} placeholder={t('nickname', locale)} required />
            <input name="name" className="silsilah-input" style={{ width: 150 }} placeholder={t('name', locale)} />
            <button type="submit" className="btn-silsilah btn-silsilah-primary btn-silsilah-sm">{t('save', locale)}</button>
          </div>
        )}
      </div>
    </form>
  );

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-2">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{user.name || user.nickname}</h1>
        {isAuthenticated && (
          <div className="flex gap-1">
            <button onClick={() => onNavigate('edit', { userId: user.id })} className="btn-silsilah btn-silsilah-primary btn-silsilah-sm">
              {t('edit', locale)}
            </button>
            <button onClick={() => onNavigate('chart', { userId: user.id })} className="btn-silsilah btn-silsilah-info btn-silsilah-sm">
              {t('show_family_chart', locale)}
            </button>
            <button onClick={() => onNavigate('tree', { userId: user.id })} className="btn-silsilah btn-silsilah-success btn-silsilah-sm">
              {t('show_family_tree', locale)}
            </button>
            <button onClick={() => onNavigate('tree2', { userId: user.id })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
              {t('family_tree', locale)} (V)
            </button>
            <button onClick={() => onNavigate('marriages', { userId: user.id })} className="btn-silsilah btn-silsilah-warning btn-silsilah-sm">
              {t('show_marriages', locale)}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column - Profile */}
        <div>
          <div className="silsilah-panel">
            <div className="silsilah-panel-heading">{t('my_profile', locale)}</div>
            <div className="silsilah-panel-body">
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
              <table className="silsilah-table" style={{ marginBottom: 0 }}>
                <tbody>
                  <tr><td style={{ fontWeight: 'bold', width: 120 }}>{t('name', locale)}</td><td>{user.name || '-'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>{t('nickname', locale)}</td><td>{user.nickname}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>{t('gender', locale)}</td><td>{gender}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>{t('dob', locale)}</td><td>{user.dob || '-'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>{t('birth_order', locale)}</td><td>{user.birthOrder || '-'}</td></tr>
                  {user.dod && <tr><td style={{ fontWeight: 'bold' }}>{t('dod', locale)}</td><td>{user.dod}</td></tr>}
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>{t('age', locale)}</td>
                    <td title={age?.detail || ''}>
                      {age ? `${age.years} ${t('age_years', locale)}` : '-'}
                      {user.dod && <span style={{ color: '#bf5329', marginLeft: 5 }}>({t('dead', locale)})</span>}
                    </td>
                  </tr>
                  <tr><td style={{ fontWeight: 'bold' }}>{t('email', locale)}</td><td>{user.email || '-'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>{t('phone', locale)}</td><td>{user.phone || '-'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>{t('address', locale)}</td><td>{user.address || '-'}</td></tr>
                </tbody>
              </table>
              {user.dod && (
                <div className="mt-3">
                  <button onClick={() => onNavigate('death', { userId: user.id })} className="btn-silsilah btn-silsilah-danger btn-silsilah-sm">
                    {t('death', locale)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Family */}
        <div className="lg:col-span-2">
          {/* Family panel */}
          <div className="silsilah-panel">
            <div className="silsilah-panel-heading">{t('family', locale)}</div>
            <div className="silsilah-panel-body">
              <table className="silsilah-table silsilah-table-bordered" style={{ marginBottom: 15 }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', width: 100 }}>{t('father', locale)}</td>
                    <td>
                      {father ? (
                        <button onClick={() => onNavigate('user', { userId: father.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                          {father.name || father.nickname}
                        </button>
                      ) : '-'}
                      {isAuthenticated && !father && (
                        <button onClick={handleSetFatherSelect} className="btn-silsilah btn-silsilah-xs btn-silsilah-success" style={{ marginLeft: 5 }}>
                          + {t('set_father', locale)}
                        </button>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>{t('mother', locale)}</td>
                    <td>
                      {mother ? (
                        <button onClick={() => onNavigate('user', { userId: mother.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                          {mother.name || mother.nickname}
                        </button>
                      ) : '-'}
                      {isAuthenticated && !mother && (
                        <button onClick={handleSetMotherSelect} className="btn-silsilah btn-silsilah-xs btn-silsilah-success" style={{ marginLeft: 5 }}>
                          + {t('set_mother', locale)}
                        </button>
                      )}
                    </td>
                  </tr>
                  {parentCouple && (
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>{t('parent', locale)}</td>
                      <td>
                        <button onClick={() => onNavigate('couple', { coupleId: parentCouple.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                          {father?.name || father?.nickname} & {mother?.name || mother?.nickname}
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Set Father Inline Form */}
              {showSetFather && (
                <InlineSelectOrCreateForm
                  mode={formMode}
                  onToggleMode={() => setFormMode(formMode === 'select' ? 'create' : 'select')}
                  selectUsers={selectUsers}
                  onSubmit={handleSubmitSetFather}
                  cancelAction={() => setShowSetFather(false)}
                  createGenderLabel={t('male', locale)}
                />
              )}

              {/* Set Mother Inline Form */}
              {showSetMother && (
                <InlineSelectOrCreateForm
                  mode={formMode}
                  onToggleMode={() => setFormMode(formMode === 'select' ? 'create' : 'select')}
                  selectUsers={selectUsers}
                  onSubmit={handleSubmitSetMother}
                  cancelAction={() => setShowSetMother(false)}
                  createGenderLabel={t('female', locale)}
                />
              )}

              {/* Spouses */}
              <div style={{ marginBottom: 15 }}>
                <div className="flex items-center justify-between mb-1">
                  <strong>{spouseLabel}</strong>
                  {isAuthenticated && (
                    <button onClick={handleAddSpouseOpen} className="btn-silsilah btn-silsilah-xs btn-silsilah-success">
                      + {addSpouseLabel}
                    </button>
                  )}
                </div>
                {marriages && marriages.length > 0 ? (
                  <div>
                    {marriages.map((m: any) => {
                      const spouse = user.genderId === 1 ? m.wife : m.husband;
                      return (
                        <div key={m.id} className="silsilah-list-group-item flex items-center justify-between">
                          <button onClick={() => onNavigate('user', { userId: spouse.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                            {spouse.name || spouse.nickname}
                          </button>
                          <button onClick={() => onNavigate('couple', { coupleId: m.id })} className="btn-silsilah btn-silsilah-xs btn-silsilah-default">
                            {t('couple_detail', locale)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: '#999', fontSize: 13 }}>-</div>
                )}
              </div>

              {/* Add Spouse Form */}
              {showAddSpouse && (
                <InlineSelectOrCreateForm
                  mode={formMode}
                  onToggleMode={() => setFormMode(formMode === 'select' ? 'create' : 'select')}
                  selectUsers={selectUsers}
                  onSubmit={handleSubmitAddSpouse}
                  cancelAction={() => setShowAddSpouse(false)}
                  createGenderLabel={user.genderId === 1 ? t('female', locale) : t('male', locale)}
                />
              )}
            </div>
          </div>

          {/* Children panel */}
          <div className="silsilah-panel">
            <div className="silsilah-panel-heading">
              {t('childs', locale)} ({children?.length || 0})
              {isAuthenticated && (
                <button onClick={() => setShowAddChild(true)} className="btn-silsilah btn-silsilah-xs btn-silsilah-success" style={{ marginLeft: 10 }}>
                  + {t('add_child', locale)}
                </button>
              )}
            </div>
            <div className="silsilah-panel-body">
              {showAddChild && (
                <form onSubmit={handleSubmitAddChild} className="silsilah-panel" style={{ marginBottom: 10 }}>
                  <div className="silsilah-panel-body">
                    <div className="flex gap-2 flex-wrap">
                      <input name="childNickname" className="silsilah-input" style={{ width: 120 }} placeholder={t('child_name', locale)} required />
                      <input name="childName" className="silsilah-input" style={{ width: 150 }} placeholder={t('name', locale)} />
                      <select name="childGender" className="silsilah-select" style={{ width: 100 }}>
                        <option value={1}>{t('male', locale)}</option>
                        <option value={2}>{t('female', locale)}</option>
                      </select>
                      <button type="submit" className="btn-silsilah btn-silsilah-primary btn-silsilah-sm">{t('save', locale)}</button>
                      <button type="button" onClick={() => setShowAddChild(false)} className="btn-silsilah btn-silsilah-xs btn-silsilah-default">{t('cancel', locale)}</button>
                    </div>
                  </div>
                </form>
              )}
              {children && children.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {children.map((child: any) => (
                    <div key={child.id} className="silsilah-list-group-item flex items-center justify-between">
                      <div>
                        <span style={{ color: '#999', fontSize: 11, marginRight: 5 }}>
                          {getGender(child.genderId, locale)}
                        </span>
                        <button onClick={() => onNavigate('user', { userId: child.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                          {child.name || child.nickname}
                        </button>
                      </div>
                      {child.dob && <span style={{ fontSize: 11, color: '#999' }}>{child.dob}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#999', fontSize: 13 }}>-</div>
              )}
            </div>
          </div>

          {/* Siblings panel */}
          <div className="silsilah-panel">
            <div className="silsilah-panel-heading">{t('siblings', locale)} ({siblings?.length || 0})</div>
            <div className="silsilah-panel-body">
              {siblings && siblings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {siblings.map((sib: any) => (
                    <div key={sib.id} className="silsilah-list-group-item flex items-center justify-between">
                      <div>
                        <span style={{ color: '#999', fontSize: 11, marginRight: 5 }}>
                          {getGender(sib.genderId, locale)}
                        </span>
                        <button onClick={() => onNavigate('user', { userId: sib.id })} style={{ color: '#3097D1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                          {sib.name || sib.nickname}
                        </button>
                      </div>
                      {sib.dob && <span style={{ fontSize: 11, color: '#999' }}>{sib.dob}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#999', fontSize: 13 }}>-</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}