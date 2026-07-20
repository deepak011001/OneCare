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
import { SuggestedPrompts } from './suggested-prompts';
import { TypingIndicator } from './typing-indicator';

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
  const streaming = useChatStore((s) => s.streaming);
  const error = useChatStore((s) => s.error);
  const setConversations = useChatStore((s) => s.setConversations);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const updateStreamingAssistant = useChatStore((s) => s.updateStreamingAssistant);
  const setPlan = useChatStore((s) => s.setPlan);
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

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setDraft('');
    setError(null);
    setStreaming(true);
    appendMessage({ id: `user-${Date.now()}`, role: 'user', content: message });
    updateStreamingAssistant('');

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    let assistant = '';

    try {
      await streamAiChat({
        message,
        conversationId: activeConversationId,
        accessToken,
        signal: abortRef.current.signal,
        handlers: {
          onConversation: (data) => {
            setActiveConversationId(data.conversationId);
          },
          onPlan: (nextPlan) => setPlan(nextPlan),
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
            Enterprise runtime with mock streaming. No domain tools or MCP in this milestone.
          </p>
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
                  Mock provider responses only — agent routing is live, business logic is not.
                </p>
              </div>
              <SuggestedPrompts onSelect={(prompt) => void sendMessage(prompt)} />
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
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
