import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: 'employee.read', module: 'employee', description: 'Read employee profile' },
  { code: 'employee.update', module: 'employee', description: 'Update employee profile' },
  { code: 'leave.apply', module: 'leave', description: 'Apply for leave' },
  { code: 'leave.approve', module: 'leave', description: 'Approve leave' },
  { code: 'leave.cancel', module: 'leave', description: 'Cancel leave' },
  { code: 'leave.read', module: 'leave', description: 'Read own leave balance and history' },
  { code: 'holiday.read', module: 'leave', description: 'Read holiday calendar' },
  { code: 'attendance.view', module: 'attendance', description: 'View attendance (legacy alias)' },
  { code: 'attendance.read', module: 'attendance', description: 'Read own attendance' },
  { code: 'attendance.clockin', module: 'attendance', description: 'Clock in' },
  { code: 'attendance.clockout', module: 'attendance', description: 'Clock out' },
  { code: 'attendance.regularize', module: 'attendance', description: 'Regularize attendance' },
  { code: 'payroll.view', module: 'payroll', description: 'View payroll' },
  { code: 'knowledge.search', module: 'knowledge', description: 'Search knowledge' },
  { code: 'knowledge.upload', module: 'knowledge', description: 'Upload knowledge' },
  { code: 'admin.user.manage', module: 'admin', description: 'Manage users' },
  { code: 'admin.role.manage', module: 'admin', description: 'Manage roles' },
  { code: 'admin.audit.read', module: 'admin', description: 'Read audit logs' },
  { code: 'mcp.execute', module: 'mcp', description: 'Execute MCP tools' },
  { code: 'mcp.connectors.read', module: 'mcp', description: 'List MCP connectors' },
  { code: 'mcp.tools.read', module: 'mcp', description: 'List MCP tools' },
  { code: 'workflow.execute', module: 'workflow', description: 'Execute workflows' },
  { code: 'rbac.role.read', module: 'rbac', description: 'List roles' },
  { code: 'rbac.permission.read', module: 'rbac', description: 'List permissions' },
  { code: 'tenant.read', module: 'tenant', description: 'Read current tenant' },
  { code: 'auth.session.revoke', module: 'auth', description: 'Revoke sessions' },
  { code: 'ai.chat', module: 'ai', description: 'Chat with OneCare AI' },
  { code: 'ai.plan', module: 'ai', description: 'Request AI execution plans' },
  { code: 'ai.agents.read', module: 'ai', description: 'List AI agents' },
  { code: 'ai.tools.read', module: 'ai', description: 'List AI tools' },
  { code: 'ai.models.read', module: 'ai', description: 'List AI models' },
] as const;

const ROLE_PERMISSION_MAP: Record<string, readonly string[]> = {
  Employee: [
    'employee.read',
    'employee.update',
    'leave.apply',
    'leave.cancel',
    'leave.read',
    'holiday.read',
    'attendance.view',
    'attendance.read',
    'attendance.clockin',
    'attendance.clockout',
    'attendance.regularize',
    'payroll.view',
    'knowledge.search',
    'tenant.read',
    'rbac.role.read',
    'rbac.permission.read',
    'ai.chat',
    'ai.plan',
    'ai.agents.read',
    'ai.tools.read',
    'ai.models.read',
    'mcp.execute',
    'mcp.connectors.read',
    'mcp.tools.read',
  ],
  Manager: [
    'employee.read',
    'leave.apply',
    'leave.approve',
    'leave.cancel',
    'leave.read',
    'holiday.read',
    'attendance.view',
    'attendance.read',
    'attendance.clockin',
    'attendance.clockout',
    'attendance.regularize',
    'payroll.view',
    'knowledge.search',
    'workflow.execute',
    'tenant.read',
    'rbac.role.read',
    'rbac.permission.read',
    'ai.chat',
    'ai.plan',
    'ai.agents.read',
    'ai.tools.read',
    'ai.models.read',
    'mcp.execute',
    'mcp.connectors.read',
    'mcp.tools.read',
  ],
  HR: [
    'employee.read',
    'employee.update',
    'leave.apply',
    'leave.approve',
    'leave.cancel',
    'leave.read',
    'holiday.read',
    'attendance.view',
    'attendance.read',
    'attendance.clockin',
    'attendance.clockout',
    'attendance.regularize',
    'knowledge.search',
    'knowledge.upload',
    'admin.user.manage',
    'workflow.execute',
    'tenant.read',
    'rbac.role.read',
    'rbac.permission.read',
    'ai.chat',
    'ai.plan',
    'ai.agents.read',
    'ai.tools.read',
    'ai.models.read',
  ],
  Finance: [
    'employee.read',
    'payroll.view',
    'knowledge.search',
    'tenant.read',
    'rbac.role.read',
    'rbac.permission.read',
    'ai.chat',
    'ai.plan',
    'ai.agents.read',
    'ai.tools.read',
    'ai.models.read',
  ],
  IT: [
    'employee.read',
    'knowledge.search',
    'mcp.execute',
    'workflow.execute',
    'tenant.read',
    'rbac.role.read',
    'rbac.permission.read',
    'ai.chat',
    'ai.plan',
    'ai.agents.read',
    'ai.tools.read',
    'ai.models.read',
  ],
  Recruiter: [
    'employee.read',
    'knowledge.search',
    'tenant.read',
    'rbac.role.read',
    'rbac.permission.read',
    'ai.chat',
    'ai.plan',
    'ai.agents.read',
    'ai.tools.read',
    'ai.models.read',
  ],
  LearningAdmin: [
    'employee.read',
    'knowledge.search',
    'knowledge.upload',
    'tenant.read',
    'rbac.role.read',
    'rbac.permission.read',
    'ai.chat',
    'ai.plan',
    'ai.agents.read',
    'ai.tools.read',
    'ai.models.read',
  ],
  SystemAdmin: [
    'employee.read',
    'employee.update',
    'leave.apply',
    'leave.approve',
    'leave.cancel',
    'attendance.view',
    'attendance.regularize',
    'payroll.view',
    'knowledge.search',
    'knowledge.upload',
    'admin.user.manage',
    'admin.role.manage',
    'admin.audit.read',
    'mcp.execute',
    'workflow.execute',
    'tenant.read',
    'rbac.role.read',
    'rbac.permission.read',
    'auth.session.revoke',
    'ai.chat',
    'ai.plan',
    'ai.agents.read',
    'ai.tools.read',
    'ai.models.read',
  ],
  SuperAdmin: [], // SuperAdmin bypasses RBAC checks in engine
};

const DEV_USERS = [
  {
    email: 'employee@demo.onecare.local',
    displayName: 'Demo Employee',
    role: 'Employee',
    employeeCode: 'E001',
  },
  {
    email: 'manager@demo.onecare.local',
    displayName: 'Demo Manager',
    role: 'Manager',
    employeeCode: 'E002',
  },
  { email: 'hr@demo.onecare.local', displayName: 'Demo HR', role: 'HR', employeeCode: 'E003' },
  {
    email: 'admin@demo.onecare.local',
    displayName: 'Demo System Admin',
    role: 'SystemAdmin',
    employeeCode: 'E004',
  },
] as const;

async function upsertPermission(code: string, module: string, description: string) {
  return prisma.permission.upsert({
    where: { code },
    create: { code, module, description },
    update: { module, description },
  });
}

async function ensureSystemRole(code: string, name: string) {
  const existing = await prisma.role.findFirst({
    where: { code, tenantId: null, isSystem: true, deletedAt: null },
  });
  if (existing) {
    return existing;
  }
  return prisma.role.create({
    data: {
      code,
      name,
      isSystem: true,
      description: `System role ${name}`,
    },
  });
}

async function main() {
  for (const permission of PERMISSIONS) {
    await upsertPermission(permission.code, permission.module, permission.description);
  }

  const permissionByCode = Object.fromEntries(
    (await prisma.permission.findMany()).map((p) => [p.code, p.id]),
  );

  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = await ensureSystemRole(roleCode, roleCode);
    for (const permissionCode of permissionCodes) {
      const permissionId = permissionByCode[permissionCode];
      if (!permissionId) {
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        create: { roleId: role.id, permissionId },
        update: {},
      });
    }
  }

  await ensureSystemRole('SuperAdmin', 'SuperAdmin');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    create: {
      slug: 'demo',
      displayName: 'OneCare Demo Tenant',
      domain: 'demo.onecare.local',
      status: 'active',
      defaultLanguage: 'en',
      defaultTimezone: 'UTC',
      brandingJson: { primaryColor: '#3d9b8f' },
      settingsJson: { authModeHint: 'development' },
      licenseJson: { plan: 'development' },
    },
    update: {
      displayName: 'OneCare Demo Tenant',
      deletedAt: null,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'HQ' } },
    create: {
      tenantId: tenant.id,
      code: 'HQ',
      name: 'Headquarters',
    },
    update: { name: 'Headquarters', deletedAt: null },
  });

  const department = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ENG' } },
    create: {
      tenantId: tenant.id,
      organizationId: organization.id,
      code: 'ENG',
      name: 'Engineering',
    },
    update: { name: 'Engineering', deletedAt: null },
  });

  await prisma.featureFlag.upsert({
    where: { lookupKey: 'system:auth.development' },
    create: {
      lookupKey: 'system:auth.development',
      key: 'auth.development',
      scope: 'system',
      enabled: true,
      description: 'Allows development auth mode outside production',
    },
    update: { enabled: true },
  });

  const managerRole = await prisma.role.findFirstOrThrow({
    where: { code: 'Manager', isSystem: true, tenantId: null },
  });

  let managerUserId: string | undefined;

  for (const seedUser of DEV_USERS) {
    const role = await prisma.role.findFirstOrThrow({
      where: { code: seedUser.role, isSystem: true, tenantId: null },
    });

    const user = await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: tenant.id, email: seedUser.email },
      },
      create: {
        tenantId: tenant.id,
        organizationId: organization.id,
        departmentId: department.id,
        email: seedUser.email,
        displayName: seedUser.displayName,
        employeeCode: seedUser.employeeCode,
        status: 'active',
        preferredLanguage: 'en',
        timeZone: 'UTC',
        locale: 'en-US',
      },
      update: {
        displayName: seedUser.displayName,
        organizationId: organization.id,
        departmentId: department.id,
        deletedAt: null,
        status: 'active',
      },
    });

    if (seedUser.role === 'Manager') {
      managerUserId = user.id;
    }

    await prisma.userRole.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: role.id,
        },
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: role.id,
      },
      update: {},
    });
  }

  if (managerUserId) {
    await prisma.user.updateMany({
      where: {
        tenantId: tenant.id,
        email: { in: ['employee@demo.onecare.local'] },
      },
      data: { managerId: managerUserId },
    });
  }

  // Ensure manager role exists for hierarchy demos
  void managerRole;

  await prisma.featureFlag.upsert({
    where: { lookupKey: `tenant:${tenant.id}:rbac.enabled` },
    create: {
      lookupKey: `tenant:${tenant.id}:rbac.enabled`,
      key: 'rbac.enabled',
      scope: 'tenant',
      tenantId: tenant.id,
      enabled: true,
      description: 'Enable RBAC enforcement for tenant',
    },
    update: { enabled: true },
  });

  console.info('Seed completed for demo tenant', tenant.slug);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
