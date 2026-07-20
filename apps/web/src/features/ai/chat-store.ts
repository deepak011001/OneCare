import { create } from 'zustand';
import type { ChatMessageView, ConversationSummary, ExecutionPlanView } from './types';

type ChatState = {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: ChatMessageView[];
  plan: ExecutionPlanView | null;
  streaming: boolean;
  error: string | null;
  setConversations: (items: ConversationSummary[]) => void;
  setActiveConversationId: (id: string | null) => void;
  setMessages: (messages: ChatMessageView[]) => void;
  appendMessage: (message: ChatMessageView) => void;
  updateStreamingAssistant: (content: string) => void;
  setPlan: (plan: ExecutionPlanView | null) => void;
  setStreaming: (value: boolean) => void;
  setError: (error: string | null) => void;
  resetActive: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  plan: null,
  streaming: false,
  error: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateStreamingAssistant: (content) =>
    set((s) => {
      const last = s.messages[s.messages.length - 1];
      if (last?.role === 'assistant' && last.streaming) {
        return {
          messages: [...s.messages.slice(0, -1), { ...last, content }],
        };
      }
      return {
        messages: [
          ...s.messages,
          { id: `assistant-${Date.now()}`, role: 'assistant', content, streaming: true },
        ],
      };
    }),
  setPlan: (plan) => set({ plan }),
  setStreaming: (streaming) => set({ streaming }),
  setError: (error) => set({ error }),
  resetActive: () =>
    set({
      activeConversationId: null,
      messages: [],
      plan: null,
      error: null,
      streaming: false,
    }),
}));
