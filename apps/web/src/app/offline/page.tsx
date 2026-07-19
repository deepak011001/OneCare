import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You appear offline</CardTitle>
          <CardDescription>Check your network connection and try again.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app/dashboard">Retry</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
