import type { StreamController, StreamEvent, StreamTransport } from './types';

export class SseStreamController implements StreamController {
  readonly transport: StreamTransport = 'sse';
  private sequence = 0;
  private readonly abort = new AbortController();
  private readonly listeners: Array<(event: StreamEvent) => void> = [];

  get signal(): AbortSignal {
    return this.abort.signal;
  }

  onEvent(listener: (event: StreamEvent) => void): void {
    this.listeners.push(listener);
  }

  emit(event: Omit<StreamEvent, 'sequence'>): void {
    if (this.abort.signal.aborted) return;
    const next: StreamEvent = { ...event, sequence: ++this.sequence };
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  cancel(reason = 'cancelled'): void {
    if (this.abort.signal.aborted) return;
    this.emit({ type: 'cancelled', data: { reason } });
    this.abort.abort(reason);
  }

  formatSse(event: StreamEvent): string {
    const payload =
      event.data !== null && typeof event.data === 'object' && !Array.isArray(event.data)
        ? { ...(event.data as Record<string, unknown>), sequence: event.sequence }
        : { data: event.data, sequence: event.sequence };
    return `event: ${event.type}\ndata: ${JSON.stringify(payload)}\n\n`;
  }
}

/** Future WebSocket transport placeholder — same event contract as SSE. */
export class FutureWebSocketStreamController extends SseStreamController {
  override readonly transport: StreamTransport = 'websocket';
}
