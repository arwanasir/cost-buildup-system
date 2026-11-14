import React, { useEffect } from 'react';
import { useUiText } from '@/lib/ui-text';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  const localize = useUiText();
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass =
    size === 'sm'
      ? 'max-w-sm'
      : size === 'lg'
        ? 'max-w-2xl'
        : size === 'xl'
          ? 'max-w-4xl'
          : size === '5xl'
            ? 'max-w-5xl'
            : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-3 py-4 sm:px-6">
        <div
          className="fixed inset-0 z-0 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[3px]"></div>
        </div>
        <div
          className={`app-modal-panel relative z-10 my-4 w-full ${sizeClass} overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl`}
        >
          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white px-5 py-5 sm:max-h-[calc(100dvh-3rem)] sm:px-7 sm:py-6">
            <h3 className="app-modal-heading border-b border-slate-200 pb-4 text-lg font-bold tracking-tight text-slate-900">
              {localize(title)}
            </h3>
            <div className="mt-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
