import { LocalizedText } from '@/components/ui/LocalizedText';
import React from 'react';
import { Button } from './Button';
import { useUiText } from '@/lib/ui-text';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const localize = useUiText();
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            <LocalizedText text={'Error'} />
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{localize(message)}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <Button variant="danger" onClick={onRetry}>
                <LocalizedText
                  text={'\n                Retry\n              '}
                />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
