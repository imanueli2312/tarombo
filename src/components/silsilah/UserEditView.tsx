'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { t, type Locale } from '@/lib/i18n';

interface UserEditViewProps {
  userId: string;
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onRefresh?: () => void;
}

type TabType = 'profile' | 'address' | 'login' | 'death';

export default function UserEditView({ userId, locale, onNavigate, onRefresh }: UserEditViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletLoaded = useRef(false);

  // Form fields
  const [nickname, setNickname] = useState('');
  const [name, setName] = useState('');
  const [genderId, setGenderId] = useState(1);
  const [dob, setDob] = useState('');
  const [yob, setYob] = useState('');
  const [dod, setDod] = useState('');
  const [yod, setYod] = useState('');
  const [birthOrder, setBirthOrder] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Cemetery
  const [cemeteryName, setCemeteryName] = useState('');
  const [cemeteryAddress, setCemeteryAddress] = useState('');
  const [cemeteryLat, setCemeteryLat] = useState('');
  const [cemeteryLng, setCemeteryLng] = useState('');

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) { setError('User not found'); return; }
      const result = await res.json();
      const u = result.user;
      setUser(u);
      setNickname(u.nickname || '');
      setName(u.name || '');
      setGenderId(u.genderId || 1);
      setDob(u.dob || '');
      setYob(u.yob || '');
      setDod(u.dod || '');
      setYod(u.yod || '');
      setBirthOrder(u.birthOrder?.toString() || '');
      setAddress(u.address || '');
      setCity(u.city || '');
      setPhone(u.phone || '');
      setEmail(u.email || '');
      // Load metadata
      const meta = result.metadata || [];
      const metaMap: Record<string, string> = {};
      for (const m of meta) { metaMap[m.key] = m.value || ''; }
      setCemeteryName(metaMap['cemetery_location_name'] || '');
      setCemeteryAddress(metaMap['cemetery_location_address'] || '');
      setCemeteryLat(metaMap['cemetery_location_latitude'] || '');
      setCemeteryLng(metaMap['cemetery_location_longitude'] || '');
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const loadLeaflet = useCallback(() => {
    if (leafletLoaded.current) {
      initMap();
      return;
    }
    // Load CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }
    // Load JS
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => {
      leafletLoaded.current = true;
      initMap();
    };
    document.head.appendChild(s);
  }, [cemeteryLat, cemeteryLng]);

  const initMap = () => {
    if (!mapRef.current) return;
    // Clear existing map
    mapRef.current.innerHTML = '';
    const lat = parseFloat(cemeteryLat) || -0.87887;
    const lng = parseFloat(cemeteryLng) || 117.4863;
    const zoom = (cemeteryLat && cemeteryLng) ? 15 : 4;
    const map = (window as any).L.map(mapRef.current).setView([lat, lng], zoom);
    (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    if (cemeteryLat && cemeteryLng) {
      (window as any).L.marker([lat, lng]).addTo(map)
        .bindPopup(cemeteryName || 'Cemetery Location')
        .openPopup();
    }
    // Add click handler to set lat/lng
    map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
      setCemeteryLat(e.latlng.lat.toFixed(6));
      setCemeteryLng(e.latlng.lng.toFixed(6));
    });
  };

  useEffect(() => {
    if (activeTab === 'death') {
      setTimeout(loadLeaflet, 100);
    }
  }, [activeTab, loadLeaflet]);

  const handleSave = async (fields: Record<string, any>) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Update failed');
        return;
      }
      setMessage(t('update', locale) + ' OK');
      onRefresh?.();
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave({ nickname, name, genderId, dob: dob || null, yob: yob || null, dod: dod || null, yod: yod || null, birthOrder: birthOrder ? parseInt(birthOrder, 10) : null });
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave({ address, city, phone });
  };

  const handleSaveLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = { email };
    if (password) body.password = password;
    handleSave(body);
    if (password) setPassword('');
  };

  const handleSaveDeath = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave({
      dod: dod || null,
      yod: yod || null,
      cemetery_location_name: cemeteryName || null,
      cemetery_location_address: cemeteryAddress || null,
      cemetery_location_latitude: cemeteryLat || null,
      cemetery_location_longitude: cemeteryLng || null,
    });
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        onNavigate('search');
      } else {
        const d = await res.json();
        alert(d.error || 'Delete failed');
      }
    } catch { alert('Network error'); }
    setShowDeleteConfirm(false);
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (error && !user) return <div style={{ padding: 20, textAlign: 'center', color: '#bf5329' }}>{error}</div>;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'profile', label: t('edit_profile', locale) },
    { key: 'address', label: t('address_contact', locale) },
    { key: 'login', label: t('login_account', locale) },
    { key: 'death', label: t('death', locale) },
  ];

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-2">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>
          {t('edit_profile', locale)} - {user?.name || user?.nickname}
        </h1>
        <button onClick={() => onNavigate('user', { userId })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
          ← {t('show_profile', locale)}
        </button>
      </div>

      {message && <div style={{ color: '#2ab27b', marginBottom: 10 }}>{message}</div>}
      {error && <div style={{ color: '#bf5329', marginBottom: 10 }}>{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar tabs */}
        <div>
          <ul className="nav-pills" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {tabs.map((tab) => (
              <li key={tab.key} style={{ marginBottom: 2 }} className={activeTab === tab.key ? 'active' : ''}>
                <button
                  onClick={() => setActiveTab(tab.key)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 15px', border: 'none', cursor: 'pointer', borderRadius: 4, fontSize: 14, background: activeTab === tab.key ? '#3097D1' : 'transparent', color: activeTab === tab.key ? '#fff' : '#636b6f' }}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-silsilah btn-silsilah-danger"
              style={{ width: '100%' }}
            >
              {t('delete_user', locale)}
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="lg:col-span-3">
          <div className="silsilah-panel">
            <div className="silsilah-panel-heading">{tabs.find(t => t.key === activeTab)?.label}</div>
            <div className="silsilah-panel-body">
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile}>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('nickname', locale)}</label>
                    <input className="silsilah-input" value={nickname} onChange={e => setNickname(e.target.value)} required />
                  </div>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('name', locale)}</label>
                    <input className="silsilah-input" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('gender', locale)}</label>
                    <select className="silsilah-select" value={genderId} onChange={e => setGenderId(parseInt(e.target.value, 10))}>
                      <option value={1}>{t('male', locale)}</option>
                      <option value={2}>{t('female', locale)}</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="silsilah-form-group">
                      <label className="silsilah-control-label">{t('dob', locale)}</label>
                      <input type="date" className="silsilah-input" value={dob} onChange={e => setDob(e.target.value)} />
                    </div>
                    <div className="silsilah-form-group">
                      <label className="silsilah-control-label">{t('yob', locale)}</label>
                      <input type="text" className="silsilah-input" value={yob} onChange={e => setYob(e.target.value)} placeholder="YYYY" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="silsilah-form-group">
                      <label className="silsilah-control-label">{t('dod', locale)}</label>
                      <input type="date" className="silsilah-input" value={dod} onChange={e => setDod(e.target.value)} />
                    </div>
                    <div className="silsilah-form-group">
                      <label className="silsilah-control-label">{t('yod', locale)}</label>
                      <input type="text" className="silsilah-input" value={yod} onChange={e => setYod(e.target.value)} placeholder="YYYY" />
                    </div>
                  </div>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('birth_order', locale)}</label>
                    <input type="number" className="silsilah-input" value={birthOrder} onChange={e => setBirthOrder(e.target.value)} style={{ width: 100 }} />
                  </div>
                  <button type="submit" className="btn-silsilah btn-silsilah-primary" disabled={saving}>
                    {saving ? 'Saving...' : t('save', locale)}
                  </button>
                </form>
              )}

              {activeTab === 'address' && (
                <form onSubmit={handleSaveAddress}>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('address', locale)}</label>
                    <textarea className="silsilah-textarea" value={address} onChange={e => setAddress(e.target.value)} />
                  </div>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('city', locale)}</label>
                    <input className="silsilah-input" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('phone', locale)}</label>
                    <input className="silsilah-input" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-silsilah btn-silsilah-primary" disabled={saving}>
                    {saving ? 'Saving...' : t('save', locale)}
                  </button>
                </form>
              )}

              {activeTab === 'login' && (
                <form onSubmit={handleSaveLogin}>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('email', locale)}</label>
                    <input type="email" className="silsilah-input" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('new_password', locale)}</label>
                    <input type="password" className="silsilah-input" value={password} onChange={e => setPassword(e.target.value)} minLength={6} placeholder="Leave blank to keep current" />
                  </div>
                  <button type="submit" className="btn-silsilah btn-silsilah-primary" disabled={saving}>
                    {saving ? 'Saving...' : t('save', locale)}
                  </button>
                </form>
              )}

              {activeTab === 'death' && (
                <form onSubmit={handleSaveDeath}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="silsilah-form-group">
                      <label className="silsilah-control-label">{t('dod', locale)}</label>
                      <input type="date" className="silsilah-input" value={dod} onChange={e => setDod(e.target.value)} />
                    </div>
                    <div className="silsilah-form-group">
                      <label className="silsilah-control-label">{t('yod', locale)}</label>
                      <input type="text" className="silsilah-input" value={yod} onChange={e => setYod(e.target.value)} placeholder="YYYY" />
                    </div>
                  </div>
                  <hr style={{ borderColor: '#dce4ec', margin: '15px 0' }} />
                  <h4 style={{ marginBottom: 10 }}>{t('cemetery_location', locale)}</h4>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('location_name', locale)}</label>
                    <input className="silsilah-input" value={cemeteryName} onChange={e => setCemeteryName(e.target.value)} />
                  </div>
                  <div className="silsilah-form-group">
                    <label className="silsilah-control-label">{t('location_address', locale)}</label>
                    <input className="silsilah-input" value={cemeteryAddress} onChange={e => setCemeteryAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="silsilah-form-group">
                      <label className="silsilah-control-label">{t('latitude', locale)}</label>
                      <input className="silsilah-input" value={cemeteryLat} onChange={e => setCemeteryLat(e.target.value)} placeholder="-0.87887" />
                    </div>
                    <div className="silsilah-form-group">
                      <label className="silsilah-control-label">{t('longitude', locale)}</label>
                      <input className="silsilah-input" value={cemeteryLng} onChange={e => setCemeteryLng(e.target.value)} placeholder="117.4863" />
                    </div>
                  </div>
                  <div ref={mapRef} style={{ height: 300, borderRadius: 4, marginBottom: 10 }} />
                  <button type="submit" className="btn-silsilah btn-silsilah-primary" disabled={saving}>
                    {saving ? 'Saving...' : t('save', locale)}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="silsilah-panel" style={{ width: 400, maxWidth: '90%' }}>
            <div className="silsilah-panel-body text-center">
              <p style={{ marginBottom: 15 }}>{t('delete_confirm', locale)}</p>
              <div className="flex justify-center gap-2">
                <button onClick={handleDelete} className="btn-silsilah btn-silsilah-danger">
                  {t('delete_confirm_button', locale)}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-silsilah btn-silsilah-default">
                  {t('cancel', locale)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}