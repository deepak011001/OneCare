import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
          <CardDescription>
            Placeholder page for planned maintenance windows. Not wired to feature flags yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          OneCare · One Place. Every Answer.
        </CardContent>
      </Card>
    </main>
  );
}
