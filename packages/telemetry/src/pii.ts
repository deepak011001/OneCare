const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'clientSecret',
]);

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***';
  }
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function redactPii<T extends Record<string, unknown>>(input: T): T {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(key)) {
      output[key] = '[REDACTED]';
      continue;
    }
    if (key.toLowerCase().includes('email') && typeof value === 'string') {
      output[key] = maskEmail(value);
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = redactPii(value as Record<string, unknown>);
      continue;
    }
    output[key] = value;
  }
  return output as T;
}
