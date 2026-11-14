import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AppIcon } from './AppIcon';
import { useAuthStore } from '@/store/auth.store';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { useTranslation } from 'react-i18next';
import { useUiText } from '@/lib/ui-text';

function initials(name?: string) {
  return (name || 'User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppLayout() {
  const { t } = useTranslation();
  const localize = useUiText();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const displayName = user?.fullName?.trim() || user?.email || 'User';
  const roleName = (user?.role || '').replaceAll('_', ' ');

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setIsDesktopSidebarOpen((isOpen) => !isOpen);
      return;
    }
    setIsMobileSidebarOpen((isOpen) => !isOpen);
  };

  return (
    <div className="app-shell flex h-dvh min-h-0 overflow-hidden">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        isDesktopOpen={isDesktopSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="app-topbar z-20 flex min-h-[76px] shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="app-icon-button -ml-1"
              onClick={toggleSidebar}
              aria-label={localize('Toggle navigation')}
              aria-controls="main-navigation"
            >
              <AppIcon name="menu" className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 sm:block">
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-slate-400">
                <LocalizedText text={'Import operations'} />
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                <LocalizedText text={'Cost Buildup Management'} />
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell />
            <div className="mx-1 hidden h-9 border-l sm:block" />
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-800 ring-2 ring-white sm:h-9 sm:w-9 sm:text-xs">
                {initials(displayName)}
              </div>
              <div className="hidden min-w-0 max-w-[150px] md:block">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {displayName}
                </p>
                <p className="truncate text-[11px] capitalize text-slate-500">
                  {localize(roleName)}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              aria-label={t('common.logout')}
              className="rounded-lg p-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 sm:px-3 sm:text-sm"
            >
              <span className="hidden sm:inline">{t('common.logout')}</span>
              <AppIcon name="logout" className="h-4 w-4 sm:hidden" />
            </button>
          </div>
        </header>
        <main className="app-main min-h-0 flex-1 overflow-x-hidden overflow-y-auto focus:outline-none">
          <div className="app-content mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 xl:px-9">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
