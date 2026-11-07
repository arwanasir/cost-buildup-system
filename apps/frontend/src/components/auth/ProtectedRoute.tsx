import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  requiredPermission?: string | string[];
  children?: React.ReactNode;
}

export function ProtectedRoute({
  requiredPermission,
  children,
}: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.accessToken);
  const initialized = useAuthStore((state) => state.initialized);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!initialized) {
    return (
      <div className="p-6 text-sm text-gray-600">Restoring session...</div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission) {
    const isAllowed = Array.isArray(requiredPermission)
      ? requiredPermission.some((p) => hasPermission(p))
      : hasPermission(requiredPermission);

    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
