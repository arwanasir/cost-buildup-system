import { useUiText } from '@/lib/ui-text';
import { useNavigate } from 'react-router-dom';

export function BackButton({
  to,
  label = 'Back to list',
}: {
  to: string;
  label?: string;
}) {
  const navigate = useNavigate();
  const localize = useUiText();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <span aria-hidden="true">←</span>
      {localize(label)}
    </button>
  );
}
