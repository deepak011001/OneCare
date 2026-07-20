import {
  LayoutDashboard,
  Sparkles,
  Briefcase,
  Users,
  BookOpen,
  CheckSquare,
  BarChart3,
  Shield,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** If empty, visible to any authenticated user */
  permissions?: readonly string[];
  children?: readonly NavItem[];
  placeholder?: boolean;
};

export const APP_NAV: readonly NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/app/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'ai',
    label: 'OneCare AI',
    href: '/app/ai',
    icon: Sparkles,
    permissions: ['ai.chat'],
  },
  {
    id: 'employee',
    label: 'Employee Services',
    href: '/app/employee',
    icon: Briefcase,
    permissions: ['employee.read', 'leave.read'],
  },
  {
    id: 'manager',
    label: 'Manager Services',
    href: '/app/manager',
    icon: Users,
    permissions: ['leave.approve'],
    placeholder: true,
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    href: '/app/employee/knowledge',
    icon: BookOpen,
    permissions: ['knowledge.search'],
  },
  {
    id: 'approvals',
    label: 'Approvals',
    href: '/app/approvals',
    icon: CheckSquare,
    permissions: ['leave.approve', 'workflow.execute'],
    placeholder: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/app/analytics',
    icon: BarChart3,
    permissions: ['admin.audit.read'],
    placeholder: true,
  },
  {
    id: 'admin',
    label: 'Administration',
    href: '/app/admin',
    icon: Shield,
    permissions: ['admin.user.manage', 'admin.role.manage'],
    placeholder: true,
    children: [
      {
        id: 'admin-users',
        label: 'Users',
        href: '/app/admin/users',
        icon: Users,
        permissions: ['admin.user.manage'],
        placeholder: true,
      },
      {
        id: 'admin-roles',
        label: 'Roles',
        href: '/app/admin/roles',
        icon: Shield,
        permissions: ['admin.role.manage'],
        placeholder: true,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/app/settings',
    icon: Settings,
  },
  {
    id: 'help',
    label: 'Help',
    href: '/app/help',
    icon: HelpCircle,
  },
];

export function filterNavByPermissions(
  items: readonly NavItem[],
  hasAny: (permissions: readonly string[]) => boolean,
): NavItem[] {
  return items
    .map((item) => {
      const children = item.children ? filterNavByPermissions(item.children, hasAny) : undefined;
      const allowed =
        !item.permissions || item.permissions.length === 0 || hasAny(item.permissions);
      if (!allowed) {
        return null;
      }
      return {
        ...item,
        ...(children ? { children } : {}),
      };
    })
    .filter((item): item is NavItem => item !== null);
}
