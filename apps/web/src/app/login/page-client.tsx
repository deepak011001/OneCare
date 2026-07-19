'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { brand } from '@onecare/ui';
import { api, ApiError, getApiBaseUrl } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

const DEV_USERS = [
  { email: 'employee@demo.onecare.local', label: 'Employee' },
  { email: 'manager@demo.onecare.local', label: 'Manager' },
  { email: 'hr@demo.onecare.local', label: 'HR' },
  { email: 'admin@demo.onecare.local', label: 'System Admin' },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/app/dashboard';
  const setPrincipal = useAuthStore((s) => s.setPrincipal);
  const [email, setEmail] = useState<string>(DEV_USERS[0].email);
  const [loading, setLoading] = useState(false);
  const authMode = useMemo(
    () => (process.env.NEXT_PUBLIC_AUTH_MODE === 'entra' ? 'entra' : 'development'),
    [],
  );

  async function loginDevelopment(selectedEmail: string) {
    setLoading(true);
    try {
      const result = await api.loginDevelopment(selectedEmail);
      setPrincipal(result.data.principal);
      toast.success(`Signed in as ${result.data.principal.displayName}`);
      router.replace(next);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to sign in';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function loginMicrosoft() {
    setLoading(true);
    try {
      const result = await api.beginEntraLogin();
      window.location.href = result.data.authorizationUrl;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to start Microsoft login';
      toast.error(`${message}. API: ${getApiBaseUrl()}`);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,hsla(172,45%,42%,0.12),transparent_45%),hsl(var(--background))] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-3xl">{brand.name}</CardTitle>
          <CardDescription>{brand.tagline}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authMode === 'entra' ? (
            <Button type="button" className="w-full" disabled={loading} onClick={() => void loginMicrosoft()}>
              {loading ? <Spinner className="text-primary-foreground" /> : null}
              Sign in with Microsoft
            </Button>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Development authentication (API <code>AUTH_MODE=development</code>). Select a seeded user.
              </p>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Email</span>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  list="dev-users"
                  autoComplete="username"
                />
                <datalist id="dev-users">
                  {DEV_USERS.map((user) => (
                    <option key={user.email} value={user.email}>
                      {user.label}
                    </option>
                  ))}
                </datalist>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DEV_USERS.map((user) => (
                  <Button
                    key={user.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => {
                      setEmail(user.email);
                      void loginDevelopment(user.email);
                    }}
                  >
                    {user.label}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={loading}
                onClick={() => void loginDevelopment(email)}
              >
                {loading ? <Spinner className="text-primary-foreground" /> : null}
                Continue
              </Button>
            </>
          )}
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
