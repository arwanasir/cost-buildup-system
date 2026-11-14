import { LocalizedText } from '@/components/ui/LocalizedText';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { api } from '@/lib/api-client';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const selectedLanguage = i18n.resolvedLanguage?.startsWith('am')
    ? 'am'
    : 'en';

  const handleLanguageChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newLang = event.target.value;

      // Change language immediately in the UI
      await i18n.changeLanguage(newLang);

      // Persist choice to backend
      try {
        await api.patch('/users/me/language', { language: newLang });
      } catch (error) {
        console.error('Failed to persist language preference', error);
        // Optional: show a toast here in the future
      }
    },
    [i18n],
  );

  return (
    <select
      value={selectedLanguage}
      onChange={handleLanguageChange}
      className="max-w-[96px] rounded-lg border border-gray-300 bg-white px-1.5 py-1.5 text-xs outline-none focus:border-sky-500 sm:max-w-none sm:px-2 sm:text-sm"
    >
      <option value="en">
        <LocalizedText text={'English'} />
      </option>
      <option value="am">አማርኛ</option>
    </select>
  );
}
