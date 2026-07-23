'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { t, type Locale } from '@/lib/i18n';
import { computeAge } from '@/lib/auth';

interface DeathInfoViewProps {
  userId: string;
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export default function DeathInfoView({ userId, locale, onNavigate }: DeathInfoViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletLoaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/death`);
        if (!res.ok) { setError('Not found'); return; }
        setData(await res.json());
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const initMap = useCallback(() => {
    if (!mapRef.current || !data?.cemeteryLocationLatitude || !data?.cemeteryLocationLongitude) return;
    mapRef.current.innerHTML = '';

    if (!leafletLoaded.current) {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);
      }
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => {
        leafletLoaded.current = true;
        buildMap();
      };
      document.head.appendChild(s);
    } else {
      buildMap();
    }
  }, [data]);

  useEffect(() => {
    if (data) {
      setTimeout(initMap, 100);
    }
  }, [data, initMap]);

  const buildMap = () => {
    if (!mapRef.current || !data?.cemeteryLocationLatitude || !data?.cemeteryLocationLongitude) return;
    const lat = parseFloat(data.cemeteryLocationLatitude);
    const lng = parseFloat(data.cemeteryLocationLongitude);
    const map = (window as any).L.map(mapRef.current).setView([lat, lng], 15);
    (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    (window as any).L.marker([lat, lng]).addTo(map)
      .bindPopup(data.cemeteryLocationName || 'Cemetery Location')
      .openPopup();
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, textAlign: 'center', color: '#bf5329' }}>{error}</div>;
  if (!data) return null;

  const ageAtDeath = computeAge({ dob: data.dob, dod: data.dod, yob: data.yob, yod: data.yod });
  const googleMapsUrl = data.cemeteryLocationLatitude && data.cemeteryLocationLongitude
    ? `https://www.google.com/maps?q=${data.cemeteryLocationLatitude},${data.cemeteryLocationLongitude}`
    : null;

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-2">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('death', locale)} - {data.name || data.nickname}</h1>
        <button onClick={() => onNavigate('user', { userId })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
          ← {t('show_profile', locale)}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="silsilah-panel">
          <div className="silsilah-panel-heading">{t('death', locale)} Info</div>
          <div className="silsilah-panel-body">
            <table className="silsilah-table" style={{ marginBottom: 0 }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: 140 }}>{t('name', locale)}</td>
                  <td>{data.name || data.nickname}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>{t('dod', locale)}</td>
                  <td>{data.dod || data.yod || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>{t('age', locale)}</td>
                  <td>{ageAtDeath ? `${ageAtDeath.years} ${t('age_years', locale)} (${ageAtDeath.detail})` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="silsilah-panel">
          <div className="silsilah-panel-heading">{t('cemetery_location', locale)}</div>
          <div className="silsilah-panel-body">
            <table className="silsilah-table" style={{ marginBottom: 0 }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: 140 }}>{t('location_name', locale)}</td>
                  <td>{data.cemeteryLocationName || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>{t('location_address', locale)}</td>
                  <td>{data.cemeteryLocationAddress || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Koordinat</td>
                  <td>
                    {data.cemeteryLocationLatitude && data.cemeteryLocationLongitude
                      ? `${data.cemeteryLocationLatitude}, ${data.cemeteryLocationLongitude}`
                      : '-'}
                  </td>
                </tr>
                {googleMapsUrl && (
                  <tr>
                    <td />
                    <td>
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-silsilah btn-silsilah-info btn-silsilah-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        {t('open_in_google_map', locale)}
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(data.cemeteryLocationLatitude && data.cemeteryLocationLongitude) && (
        <div className="silsilah-panel mt-4">
          <div className="silsilah-panel-heading">{t('cemetery_location', locale)}</div>
          <div className="silsilah-panel-body" style={{ padding: 0 }}>
            <div ref={mapRef} style={{ height: 400, borderRadius: '0 0 4px 4px' }} />
          </div>
        </div>
      )}
    </div>
  );
}