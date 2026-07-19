import { describe, expect, it } from 'vitest';
import { LayoutDashboard, Shield, Users } from 'lucide-react';
import { filterNavByPermissions, type NavItem } from '@/features/navigation/nav-config';

const items: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  {
    id: 'manager',
    label: 'Manager',
    href: '/app/manager',
    icon: Users,
    permissions: ['leave.approve'],
  },
  {
    id: 'admin',
    label: 'Admin',
    href: '/app/admin',
    icon: Shield,
    permissions: ['admin.user.manage'],
    children: [
      {
        id: 'users',
        label: 'Users',
        href: '/app/admin/users',
        icon: Users,
        permissions: ['admin.user.manage'],
      },
    ],
  },
];

describe('filterNavByPermissions', () => {
  it('keeps public items and filters permission-gated ones', () => {
    const filtered = filterNavByPermissions(items, (required) =>
      required.every((p) => p === 'leave.approve'),
    );
    expect(filtered.map((i) => i.id)).toEqual(['dashboard', 'manager']);
  });

  it('includes nested children when permitted', () => {
    const filtered = filterNavByPermissions(items, (required) =>
      required.every((p) => p === 'admin.user.manage'),
    );
    expect(filtered.map((i) => i.id)).toEqual(['dashboard', 'admin']);
    expect(filtered.find((i) => i.id === 'admin')?.children?.[0]?.id).toBe('users');
  });
});
