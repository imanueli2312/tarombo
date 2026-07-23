'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { t, type Locale } from '@/lib/i18n';
import Navbar from '@/components/silsilah/Navbar';
import LoginView from '@/components/silsilah/LoginView';
import RegisterView from '@/components/silsilah/RegisterView';
import SearchView from '@/components/silsilah/SearchView';
import UserProfileView from '@/components/silsilah/UserProfileView';
import UserEditView from '@/components/silsilah/UserEditView';
import FamilyChartView from '@/components/silsilah/FamilyChartView';
import FamilyTreeView from '@/components/silsilah/FamilyTreeView';
import FamilyTreeVerticalView from '@/components/silsilah/FamilyTreeVerticalView';
import MarriagesView from '@/components/silsilah/MarriagesView';
import CoupleDetailView from '@/components/silsilah/CoupleDetailView';
import CoupleEditView from '@/components/silsilah/CoupleEditView';
import BirthdayView from '@/components/silsilah/BirthdayView';
import ChangePasswordView from '@/components/silsilah/ChangePasswordView';
import DeathInfoView from '@/components/silsilah/DeathInfoView';

type ViewType = 'search' | 'login' | 'register' | 'profile' | 'user' | 'edit' | 'chart' | 'tree' | 'tree2' | 'marriages' | 'couple' | 'edit-couple' | 'birthdays' | 'change-password' | 'death';

interface ViewParams {
  userId?: string;
  coupleId?: string;
  [key: string]: string | undefined;
}

export default function Home() {
  const { user, isAuthenticated, locale, setAuth, setLocale, logout } = useAuthStore();
  const [currentView, setCurrentView] = useState<ViewType>('search');
  const [viewParams, setViewParams] = useState<ViewParams>({});
  const [initialized, setInitialized] = useState(false);

  // Read locale from cookie on mount
  useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };
    const savedLocale = getCookie('locale') as Locale | null;
    if (savedLocale && ['en', 'id', 'ur'].includes(savedLocale)) {
      setLocale(savedLocale);
    }
  }, [setLocale]);

  // Check auth on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setAuth(data.user);
          }
        }
      } catch { /* not logged in */ }
      setInitialized(true);
    })();
  }, [setAuth]);

  const navigate = useCallback((view: string, params?: Record<string, string>) => {
    if (view === 'profile') {
      if (user) {
        setViewParams({ userId: user.id });
      }
    } else {
      setViewParams(params || {});
    }
    setCurrentView(view as ViewType);
    window.scrollTo(0, 0);
  }, [user]);

  const handleLogin = useCallback((loggedInUser: any) => {
    setAuth(loggedInUser);
    navigate('search');
  }, [setAuth, navigate]);

  const handleRegister = useCallback((newUser: any) => {
    setAuth(newUser);
    navigate('profile');
  }, [setAuth, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    logout();
    navigate('search');
  }, [logout, navigate]);

  const handleSetLocale = useCallback((l: Locale) => {
    setLocale(l);
  }, [setLocale]);

  const resolvedUserId = viewParams.userId === '_self' ? user?.id : viewParams.userId;

  const renderView = () => {
    switch (currentView) {
      case 'login':
        return <LoginView locale={locale} onLogin={handleLogin} onNavigate={(v) => navigate(v)} />;
      case 'register':
        return <RegisterView locale={locale} onRegister={handleRegister} onNavigate={(v) => navigate(v)} />;
      case 'birthdays':
        return <BirthdayView locale={locale} onNavigate={navigate} />;
      case 'change-password':
        return <ChangePasswordView locale={locale} onNavigate={(v) => navigate(v)} />;
      case 'user':
      case 'profile':
        if (!resolvedUserId) return <div style={{ padding: 20, textAlign: 'center' }}>No user ID</div>;
        return (
          <UserProfileView
            userId={resolvedUserId}
            locale={locale}
            isAuthenticated={isAuthenticated}
            onNavigate={navigate}
          />
        );
      case 'edit':
        if (!resolvedUserId) return null;
        return (
          <UserEditView
            userId={resolvedUserId}
            locale={locale}
            onNavigate={navigate}
          />
        );
      case 'chart':
        if (!resolvedUserId) return null;
        return <FamilyChartView userId={resolvedUserId} locale={locale} onNavigate={navigate} />;
      case 'tree':
        if (!resolvedUserId) return null;
        return <FamilyTreeView userId={resolvedUserId} locale={locale} onNavigate={navigate} />;
      case 'tree2':
        if (!resolvedUserId) return null;
        return <FamilyTreeVerticalView userId={resolvedUserId} locale={locale} onNavigate={navigate} />;
      case 'marriages':
        if (!resolvedUserId) return null;
        return <MarriagesView userId={resolvedUserId} locale={locale} onNavigate={navigate} />;
      case 'couple':
        if (!viewParams.coupleId) return null;
        return <CoupleDetailView coupleId={viewParams.coupleId} locale={locale} onNavigate={navigate} />;
      case 'edit-couple':
        if (!viewParams.coupleId) return null;
        return <CoupleEditView coupleId={viewParams.coupleId} locale={locale} onNavigate={navigate} />;
      case 'death':
        if (!resolvedUserId) return null;
        return <DeathInfoView userId={resolvedUserId} locale={locale} onNavigate={navigate} />;
      case 'search':
      default:
        return <SearchView locale={locale} onNavigate={navigate} />;
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="silsilah-navbar">
          <div className="max-w-7xl mx-auto px-4 flex items-center" style={{ height: 50 }}>
            <span className="text-lg font-bold text-silsilah-primary">Silsilah</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        locale={locale}
        isAuthenticated={isAuthenticated}
        userName={user?.nickname || user?.name || ''}
        onNavigate={navigate}
        onSetLocale={handleSetLocale}
        onLogout={handleLogout}
      />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        {renderView()}
      </main>
      <footer className="mt-auto border-t border-silsilah-border py-3 text-center" style={{ fontSize: 12, color: '#999' }}>
        © {new Date().getFullYear()} {t('app_name', locale)}
      </footer>
    </div>
  );
}