export type AuthPrincipal = {
  userId: string;
  tenantId: string;
  sessionId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  organizationId: string | null;
  departmentId: string | null;
  mfaCompleted: boolean;
  attributes: Record<string, unknown>;
};

export type TenantSummary = {
  id: string;
  slug: string;
  displayName: string;
  domain: string | null;
  status: string;
  branding: unknown;
  settings: unknown;
  defaultLanguage: string;
  defaultTimezone: string;
  license: unknown;
  createdAt: string;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    correlationId?: string;
    requestId?: string;
    [key: string]: unknown;
  };
};

export type AuthLoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  principal: AuthPrincipal;
};

export type RoleDto = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  tenantId: string | null;
};
