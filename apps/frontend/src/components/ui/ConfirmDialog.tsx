import { LocalizedText } from '@/components/ui/LocalizedText';
import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useUiText } from '@/lib/ui-text';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  impactMessage?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  impactMessage,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const localize = useUiText();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="mt-2">
        <p className="text-sm text-gray-500">{localize(message)}</p>

        {children && <div className="mt-4">{children}</div>}

        {impactMessage && (
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">
                  <LocalizedText
                    text={
                      '\n                  Impact Warning\n                '
                    }
                  />
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  {localize(impactMessage)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
        <Button
          variant={isDestructive ? 'danger' : 'primary'}
          onClick={onConfirm}
          isLoading={isLoading}
          className="w-full sm:ml-3 sm:w-auto"
        >
          {localize(confirmText)}
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
          className="mt-3 w-full sm:mt-0 sm:w-auto"
        >
          {localize(cancelText)}
        </Button>
      </div>
    </Modal>
  );
}
