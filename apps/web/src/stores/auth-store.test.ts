import { describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';

describe('auth store permissions', () => {
  it('denies by default and allows listed permissions', () => {
    useAuthStore.setState({
      principal: {
        userId: 'u1',
        tenantId: 't1',
        sessionId: 's1',
        email: 'a@b.com',
        displayName: 'A',
        roles: ['Employee'],
        permissions: ['employee.read'],
        organizationId: null,
        departmentId: null,
        mfaCompleted: true,
        attributes: {},
      },
    });
    expect(useAuthStore.getState().hasPermission('employee.read')).toBe(true);
    expect(useAuthStore.getState().hasPermission('admin.user.manage')).toBe(false);
  });

  it('grants SuperAdmin all permissions', () => {
    useAuthStore.setState({
      principal: {
        userId: 'u1',
        tenantId: 't1',
        sessionId: 's1',
        email: 'a@b.com',
        displayName: 'A',
        roles: ['SuperAdmin'],
        permissions: [],
        organizationId: null,
        departmentId: null,
        mfaCompleted: true,
        attributes: {},
      },
    });
    expect(useAuthStore.getState().hasPermission('admin.audit.read')).toBe(true);
  });
});
