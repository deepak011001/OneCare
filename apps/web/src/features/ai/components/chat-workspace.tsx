'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { streamAiChat } from '../stream-chat';
import { useChatStore } from '../chat-store';
import type { ChatMessageView, ConversationSummary } from '../types';
import { ConversationSidebar } from './conversation-sidebar';
import { MessageBubble } from './message-bubble';
import { TypingIndicator } from './typing-indicator';
import { SuggestedPrompts } from './suggested-prompts';
import { ToolConfirmationCard } from './tool-confirmation-card';

export function ChatWorkspace() {
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const promptBootstrap = useRef(false);

  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const messages = useChatStore((s) => s.messages);
  const plan = useChatStore((s) => s.plan);
  const pendingConfirmation = useChatStore((s) => s.pendingConfirmation);
  const toolStatus = useChatStore((s) => s.toolStatus);
  const streaming = useChatStore((s) => s.streaming);
  const error = useChatStore((s) => s.error);
  const setConversations = useChatStore((s) => s.setConversations);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const updateStreamingAssistant = useChatStore((s) => s.updateStreamingAssistant);
  const setPlan = useChatStore((s) => s.setPlan);
  const setPendingConfirmation = useChatStore((s) => s.setPendingConfirmation);
  const setToolStatus = useChatStore((s) => s.setToolStatus);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setError = useChatStore((s) => s.setError);
  const resetActive = useChatStore((s) => s.resetActive);

  useEffect(() => {
    void api
      .listAiConversations()
      .then((res) => {
        setConversations(res.data as ConversationSummary[]);
      })
      .catch(() => {
        setConversations([]);
      });
  }, [setConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (!prompt || promptBootstrap.current) return;
    promptBootstrap.current = true;
    setDraft(prompt);
  }, [searchParams]);

  const empty = messages.length === 0 && !streaming;

  const planLabel = useMemo(() => {
    if (!plan) return null;
    return `${plan.summary} · ${plan.mode}`;
  }, [plan]);

  async function loadConversation(id: string) {
    setError(null);
    setActiveConversationId(id);
    const res = await api.getAiConversation(id);
    const loaded = res.data.messages.map((m): ChatMessageView => ({
      id: String(m.id),
      role: m.role as ChatMessageView['role'],
      content: m.content,
    }));
    setMessages(loaded);
    setPlan(null);
  }

  const [confirmBusy, setConfirmBusy] = useState(false);
  const lastMessageRef = useRef('');

  async function runStream(message: string, approvedToolConfirmations?: Record<string, string>) {
    lastMessageRef.current = message;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    let assistant = '';

    await streamAiChat({
      message,
      conversationId: activeConversationId,
      accessToken,
      signal: abortRef.current.signal,
      ...(approvedToolConfirmations ? { approvedToolConfirmations } : {}),
      handlers: {
        onConversation: (data) => {
          setActiveConversationId(data.conversationId);
        },
        onPlan: (nextPlan) => setPlan(nextPlan),
        onConfirmationRequired: (data) => {
          if (data.confirmationId) {
            setPendingConfirmation({
              confirmationId: data.confirmationId,
              toolName: data.toolName,
              connectorId: data.connectorId,
              ...(data.summary ? { summary: data.summary } : {}),
            });
          }
        },
        onTool: (data) => {
          const status = String(data.status ?? '');
          if (status) setToolStatus(`Tool ${String(data.name ?? '')}: ${status}`);
        },
        onDelta: (delta) => {
          assistant += delta;
          updateStreamingAssistant(assistant);
        },
        onDone: async () => {
          const finalized = useChatStore
            .getState()
            .messages.map((m) =>
              m.streaming ? { ...m, streaming: false, content: assistant || m.content } : m,
            );
          setMessages(finalized);
          const list = await api.listAiConversations();
          setConversations(list.data as ConversationSummary[]);
        },
        onError: (err) => setError(err),
      },
    });
  }

  async function sendMessage(
    text: string,
    approvedToolConfirmations?: Record<string, string>,
    options?: { skipUserMessage?: boolean },
  ) {
    const message = text.trim();
    if (!message || streaming) return;
    if (!options?.skipUserMessage) {
      setDraft('');
    }
    setError(null);
    setStreaming(true);
    if (!options?.skipUserMessage) {
      setPendingConfirmation(null);
      setToolStatus(null);
      appendMessage({ id: `user-${Date.now()}`, role: 'user', content: message });
    }
    updateStreamingAssistant('');

    try {
      await runStream(message, approvedToolConfirmations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      const finalized = useChatStore
        .getState()
        .messages.map((m) =>
          m.role === 'assistant' && m.streaming ? { ...m, streaming: false } : m,
        );
      setMessages(finalized);
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[32rem] overflow-hidden rounded-xl border border-border bg-background">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={(id) => void loadConversation(id)}
        onNew={() => {
          abortRef.current?.abort();
          resetActive();
        }}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border px-4 py-3">
          <h1 className="text-base font-semibold">OneCare AI</h1>
          <p className="text-xs text-muted-foreground">
            Planner routes to agents; leave tools execute via MCP when configured.
          </p>
          {toolStatus ? <p className="mt-1 text-xs text-muted-foreground">{toolStatus}</p> : null}
          {planLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">Plan: {planLabel}</p>
          ) : null}
        </header>

        <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div>
                <p className="text-lg font-medium">Ask OneCare</p>
                <p className="text-sm text-muted-foreground">
                  Mock LLM streaming with live MCP tool execution for leave reads.
                </p>
              </div>
              <SuggestedPrompts onSelect={(prompt) => void sendMessage(prompt)} />
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
          {pendingConfirmation ? (
            <ToolConfirmationCard
              pending={pendingConfirmation}
              busy={confirmBusy}
              onApprove={() => {
                void (async () => {
                  setConfirmBusy(true);
                  try {
                    await api.approveMcpConfirmation(pendingConfirmation.confirmationId);
                    setPendingConfirmation(null);
                    await sendMessage(
                      lastMessageRef.current,
                      {
                        [pendingConfirmation.toolName]: pendingConfirmation.confirmationId,
                      },
                      { skipUserMessage: true },
                    );
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Confirmation failed');
                  } finally {
                    setConfirmBusy(false);
                  }
                })();
              }}
              onCancel={() => {
                void (async () => {
                  setConfirmBusy(true);
                  try {
                    await api.cancelMcpConfirmation(pendingConfirmation.confirmationId);
                    setPendingConfirmation(null);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Cancel failed');
                  } finally {
                    setConfirmBusy(false);
                  }
                })();
              }}
            />
          ) : null}
          {streaming ? <TypingIndicator /> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(draft);
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message OneCare AI…"
            aria-label="Message"
            disabled={streaming}
          />
          <Button type="submit" disabled={streaming || !draft.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}
