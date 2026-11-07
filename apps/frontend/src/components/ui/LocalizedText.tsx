import { useUiText } from '@/lib/ui-text';

export function LocalizedText({ text }: { text: string }) {
  const localize = useUiText();
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const translated = localize(text) ?? text;

  return (
    <>
      {leading}
      {translated}
      {trailing}
    </>
  );
}
