import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>403 · Forbidden</CardTitle>
          <CardDescription>You do not have permission to view this resource.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild>
            <Link href="/app/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Sign in as another user</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
