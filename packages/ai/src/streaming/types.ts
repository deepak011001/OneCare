export type StreamTransport = 'sse' | 'websocket' | 'chunked';

export type StreamEventType =
  | 'conversation'
  | 'plan'
  | 'agent'
  | 'delta'
  | 'tool'
  | 'confirmation_required'
  | 'done'
  | 'error'
  | 'cancelled';

export interface StreamEvent<T = unknown> {
  readonly type: StreamEventType;
  readonly data: T;
  readonly sequence: number;
}

export interface StreamController {
  readonly transport: StreamTransport;
  readonly signal: AbortSignal;
  cancel(reason?: string): void;
  emit(event: Omit<StreamEvent, 'sequence'>): void;
}
