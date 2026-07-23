'use client';

import { useState, useRef, useEffect } from 'react';
import { t, locales, type Locale } from '@/lib/i18n';

interface NavbarProps {
  locale: Locale;
  isAuthenticated: boolean;
  userName: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onSetLocale: (locale: Locale) => void;
  onLogout: () => void;
}

export default function Navbar({ locale, isAuthenticated, userName, onNavigate, onSetLocale, onLogout }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="silsilah-navbar sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between" style={{ height: 50 }}>
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('search')}
            className="text-lg font-bold text-silsilah-primary cursor-pointer bg-transparent border-none"
            style={{ fontFamily: '"Trebuchet MS", sans-serif' }}
          >
            {t('app_name', locale)}
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => onNavigate('search')}
              className="btn-silsilah btn-silsilah-default btn-silsilah-sm"
            >
              {t('find_your_family', locale)}
            </button>
            <button
              onClick={() => onNavigate('birthdays')}
              className="btn-silsilah btn-silsilah-default btn-silsilah-sm"
            >
              {t('birthday', locale)}
            </button>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="hidden sm:flex items-center gap-1 mr-2">
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => onSetLocale(l)}
                className={`btn-silsilah btn-silsilah-xs ${locale === l ? 'btn-silsilah-primary' : 'btn-silsilah-default'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {isAuthenticated ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn-silsilah btn-silsilah-default btn-silsilah-sm flex items-center gap-1"
              >
                <span>{userName}</span>
                <span style={{ fontSize: 10 }}>&#9662;</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-silsilah-border rounded shadow-lg z-50" style={{ minWidth: 180 }}>
                  <button
                    onClick={() => { onNavigate('profile', { userId: '_self' }); setDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-silsilah-text hover:bg-silsilah-bg border-none bg-transparent cursor-pointer"
                  >
                    {t('my_profile', locale)}
                  </button>
                  <button
                    onClick={() => { onNavigate('change-password'); setDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-silsilah-text hover:bg-silsilah-bg border-none bg-transparent cursor-pointer"
                  >
                    {t('change_password', locale)}
                  </button>
                  <div className="border-t border-silsilah-border" />
                  <button
                    onClick={() => { onLogout(); setDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-silsilah-danger hover:bg-silsilah-bg border-none bg-transparent cursor-pointer"
                  >
                    {t('logout', locale)}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigate('login')}
                className="btn-silsilah btn-silsilah-default btn-silsilah-sm"
              >
                {t('login', locale)}
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="btn-silsilah btn-silsilah-primary btn-silsilah-sm"
              >
                {t('register', locale)}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}