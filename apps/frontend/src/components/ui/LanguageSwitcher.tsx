import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { api } from '@/lib/api-client';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

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
      value={i18n.language}
      onChange={handleLanguageChange}
      className="bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
    >
      <option value="en">English</option>
      <option value="am">????</option>
    </select>
  );
}
