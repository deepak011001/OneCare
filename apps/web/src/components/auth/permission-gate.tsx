'use client';

import { useAuthStore } from '@/stores/auth-store';

export function PermissionGate({
  permission,
  permissions,
  fallback = null,
  children,
}: {
  permission?: string;
  permissions?: readonly string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);

  const allowed = permission
    ? hasPermission(permission)
    : permissions
      ? hasAnyPermission(permissions)
      : true;

  if (!allowed) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
