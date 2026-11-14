import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

type AmharicResources = {
  ui?: {
    phrases?: Record<string, string>;
    words?: Record<string, string>;
  };
};

function normalize(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

const htmlEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  larr: '←',
  lt: '<',
  nbsp: ' ',
  quot: '"',
  rarr: '→',
  times: '×',
};

function decodeHtmlEntities(value: string) {
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, token: string) => {
      if (token[0] === '#') {
        const code =
          token[1]?.toLowerCase() === 'x'
            ? Number.parseInt(token.slice(2), 16)
            : Number.parseInt(token.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
      }
      return htmlEntities[token.toLowerCase()] ?? entity;
    },
  );
}

export function localizeUiText(
  value: string,
  language = i18n.resolvedLanguage,
) {
  const decoded = decodeHtmlEntities(value);
  if (!decoded || !language?.toLowerCase().startsWith('am')) return decoded;

  const source = normalize(decoded);
  const resources = i18n.getResourceBundle(
    'am',
    'translation',
  ) as AmharicResources;
  const phrases = resources.ui?.phrases ?? {};
  const words = resources.ui?.words ?? {};
  const exact =
    phrases[source] ??
    Object.entries(phrases).find(
      ([phrase]) => phrase.toLocaleLowerCase() === source.toLocaleLowerCase(),
    )?.[1];
  if (exact) return exact;

  return source.replace(/[A-Za-z]+(?:'[A-Za-z]+)*/g, (word) => {
    return words[word.toLowerCase()] ?? word;
  });
}

export function useUiText() {
  const { i18n: activeI18n } = useTranslation();
  return useCallback(
    (value?: string) =>
      value ? localizeUiText(value, activeI18n.resolvedLanguage) : '',
    [activeI18n.resolvedLanguage],
  );
}
