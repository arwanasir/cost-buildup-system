import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = 'info',
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-400',
    error: 'bg-red-50 text-red-800 border-red-400',
    info: 'bg-blue-50 text-blue-800 border-blue-400',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`border-l-4 p-4 shadow-lg rounded-md bg-white ${colors[type]}`}
      >
        <div className="flex justify-between items-center gap-4">
          <p className="text-sm font-medium">{message}</p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 focus:outline-none"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}
