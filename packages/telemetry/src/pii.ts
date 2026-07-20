const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'cookies',
  'clientSecret',
  'apiKey',
  'api_key',
  'salary',
  'payslip',
  'ssn',
  'pan',
  'bankAccount',
  'accountNumber',
  'set-cookie',
  'x-api-key',
]);

const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/g;
const EMAIL_RE = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***';
  }
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function maskPhone(value: string): string {
  return value.replace(PHONE_RE, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 8) return match;
    return `***${digits.slice(-4)}`;
  });
}

export function maskSecretsInText(value: string): string {
  return value
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(EMAIL_RE, (_m, local: string, domain: string) => {
      const visible = String(local).slice(0, Math.min(2, String(local).length));
      return `${visible}***@${domain}`;
    })
    .replace(PHONE_RE, (match) => maskPhone(match));
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(lower)) return true;
  return (
    lower.includes('password') ||
    lower.includes('secret') ||
    lower.includes('token') ||
    lower.includes('authorization') ||
    lower.includes('cookie') ||
    lower.includes('salary') ||
    lower.includes('payslip')
  );
}

export function redactPii<T extends Record<string, unknown>>(input: T): T {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (isSensitiveKey(key)) {
      output[key] = '[REDACTED]';
      continue;
    }
    if (key.toLowerCase().includes('email') && typeof value === 'string') {
      output[key] = maskEmail(value);
      continue;
    }
    if (
      (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) &&
      typeof value === 'string'
    ) {
      output[key] = maskPhone(value);
      continue;
    }
    if (typeof value === 'string') {
      output[key] = maskSecretsInText(value);
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = redactPii(value as Record<string, unknown>);
      continue;
    }
    if (Array.isArray(value)) {
      output[key] = value.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? redactPii(item as Record<string, unknown>)
          : typeof item === 'string'
            ? maskSecretsInText(item)
            : item,
      );
      continue;
    }
    output[key] = value;
  }
  return output as T;
}
