import { AppIcon } from '@/components/layout/AppIcon';
import { useUiText } from '@/lib/ui-text';
import { useThemeStore } from '@/store/theme.store';

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const localize = useUiText();
  const isDark = theme === 'dark';
  const label = localize(isDark ? 'Light theme' : 'Dark theme');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold transition sm:px-3 sm:text-sm"
      aria-label={label}
      title={label}
    >
      <AppIcon name={isDark ? 'sun' : 'moon'} className="h-[17px] w-[17px]" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
