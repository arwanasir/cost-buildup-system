import type { AxiosError } from 'axios';

interface FormErrorProps {
  error: unknown;
}

function getMessage(error: unknown): string | null {
  if (!error) return null;

  const responseMessage = (error as AxiosError<{ message?: string | string[] }>)
    .response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(', ');
  if (responseMessage) return responseMessage;
  if (error instanceof Error) return error.message;
  return 'Unable to save changes. Please review the form and try again.';
}

export function FormError({ error }: FormErrorProps) {
  const message = getMessage(error);
  if (!message) return null;

  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
  );
}
