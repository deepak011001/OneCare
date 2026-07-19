import type { ApiEnvelope, AuthLoginResponse, AuthPrincipal, RoleDto, TenantSummary } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export type TokenGetter = () => string | null;
export type TokenSetter = (tokens: { accessToken: string; refreshToken: string } | null) => void;

let getAccessToken: TokenGetter = () => null;
let getRefreshToken: TokenGetter = () => null;
let setTokens: TokenSetter = () => undefined;

export function configureApiClient(options: {
  getAccessToken: TokenGetter;
  getRefreshToken: TokenGetter;
  setTokens: TokenSetter;
}): void {
  getAccessToken = options.getAccessToken;
  getRefreshToken = options.getRefreshToken;
  setTokens = options.setTokens;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'HTTP_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { detail?: string; code?: string; title?: string };
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.detail ?? body.title ?? response.statusText,
      body.code ?? 'HTTP_ERROR',
    );
  }
  return body;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  const response = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    setTokens(null);
    return false;
  }
  const json = (await response.json()) as ApiEnvelope<AuthLoginResponse>;
  setTokens({
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
  });
  return true;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && retry) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) {
      return request<T>(path, init, false);
    }
  }

  return parseJson<T>(response);
}

export const api = {
  getMe: () => request<ApiEnvelope<AuthPrincipal>>('/v1/auth/me'),
  getUsersMe: () => request<ApiEnvelope<AuthPrincipal>>('/v1/users/me'),
  getCurrentTenant: () => request<ApiEnvelope<TenantSummary>>('/v1/tenants/current'),
  listRoles: () => request<ApiEnvelope<RoleDto[]>>('/v1/roles'),
  listPermissions: () =>
    request<ApiEnvelope<Array<{ id: string; code: string; module: string; description: string | null }>>>(
      '/v1/permissions',
    ),
  loginDevelopment: async (email: string, rememberMe = false) => {
    const result = await request<ApiEnvelope<AuthLoginResponse>>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, rememberMe }),
    });
    setTokens({
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
    });
    return result;
  },
  beginEntraLogin: () => request<ApiEnvelope<{ authorizationUrl: string }>>('/v1/auth/login'),
  logout: async () => {
    try {
      await request<ApiEnvelope<{ ok: boolean }>>('/v1/auth/logout', { method: 'POST' });
    } finally {
      setTokens(null);
    }
  },
  health: () => request<ApiEnvelope<{ status: string; service: string }>>('/v1/health'),
};

export function getApiBaseUrl(): string {
  return API_BASE;
}
