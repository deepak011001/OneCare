import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'px-4')).toContain('px-4');
  });
});

describe('ApiError', () => {
  it('captures status and code', () => {
    const error = new ApiError(401, 'Unauthorized', 'UNAUTHORIZED');
    expect(error.status).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });
});
