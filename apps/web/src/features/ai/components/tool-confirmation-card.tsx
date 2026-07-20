'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export type PendingConfirmation = {
  confirmationId: string;
  toolName: string;
  connectorId: string;
  summary?: string;
};

type Props = {
  pending: PendingConfirmation;
  busy: boolean;
  onApprove: () => void;
  onCancel: () => void;
};

export function ToolConfirmationCard({ pending, busy, onApprove, onCancel }: Props) {
  return (
    <Card className="border-amber-500/40 bg-amber-500/5 p-4">
      <p className="text-sm font-medium">Confirm tool execution</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {pending.summary ?? `${pending.toolName} via ${pending.connectorId}`}
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={onApprove} disabled={busy}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
