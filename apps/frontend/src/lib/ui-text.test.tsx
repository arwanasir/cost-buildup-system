import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalizedText } from '@/components/ui/LocalizedText';
import i18n from '@/i18n';
import { localizeUiText } from './ui-text';

afterEach(async () => {
  await i18n.changeLanguage('en');
  localStorage.removeItem('i18nextLng');
});

describe('UI localization', () => {
  it('keeps English copy unchanged and decodes JSX entities', () => {
    expect(localizeUiText('Dashboard', 'en')).toBe('Dashboard');
    expect(localizeUiText('Rate is &gt;5%', 'en')).toBe('Rate is >5%');
  });

  it('translates report titles as complete Amharic phrases', () => {
    expect(localizeUiText('Supplier Performance', 'am')).toBe('የአቅራቢ አፈጻጸም');
    expect(localizeUiText('Export to Excel', 'am')).toBe('ወደ Excel ላክ');
  });

  it('translates filters, status tabs, and uppercase table headings', () => {
    expect(localizeUiText('Active Only', 'am')).toBe('ንቁ የሆኑት ብቻ');
    expect(localizeUiText('Pending Approval', 'am')).toBe('ማጽደቅ በመጠባበቅ ላይ');
    expect(localizeUiText('NAME', 'am')).toBe('ስም');
    expect(localizeUiText('COUNTRY', 'am')).toBe('አገር');
    expect(localizeUiText('Bill of Lading', 'am')).toBe('የመርከብ ጭነት ሰነድ');
    expect(localizeUiText('Supplier Details', 'am')).toBe('የአቅራቢ ዝርዝሮች');
  });

  it('translates dynamic LC, shipment, and receipt labels', () => {
    expect(localizeUiText('payment authorised', 'am')).toBe('ክፍያ ተፈቅዷል');
    expect(localizeUiText('docs submitted', 'am')).toBe('ሰነዶች ቀርበዋል');
    expect(localizeUiText('Inspection Report', 'am')).toBe('የምርመራ ሪፖርት');
    expect(localizeUiText('Opening Fee', 'am')).toBe('የመክፈቻ ክፍያ');
    expect(localizeUiText('CIF Value', 'am')).toBe('የCIF ዋጋ');
  });

  it('updates mounted text immediately and persists the selected language', async () => {
    render(<LocalizedText text="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage('am');
    });

    expect(screen.getByText('ዳሽቦርድ')).toBeInTheDocument();
    expect(localStorage.getItem('i18nextLng')).toBe('am');
  });
});
