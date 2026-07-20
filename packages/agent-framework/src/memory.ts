import type { AgentMemoryPort } from './types';

/** In-memory pluggable memory — conversation / working / short-term / summaries. */
export class InMemoryAgentMemory implements AgentMemoryPort {
  private readonly conversation = new Map<string, Readonly<Record<string, unknown>>>();
  private readonly working = new Map<string, Readonly<Record<string, unknown>>>();
  private readonly shortTerm = new Map<string, Readonly<Record<string, unknown>>>();
  private readonly summaries = new Map<string, string>();

  async getConversation(key: string) {
    return this.conversation.get(key) ?? null;
  }
  async setConversation(key: string, value: Readonly<Record<string, unknown>>) {
    this.conversation.set(key, value);
  }
  async getWorking(key: string) {
    return this.working.get(key) ?? null;
  }
  async setWorking(key: string, value: Readonly<Record<string, unknown>>) {
    this.working.set(key, value);
  }
  async getShortTerm(key: string) {
    return this.shortTerm.get(key) ?? null;
  }
  async setShortTerm(key: string, value: Readonly<Record<string, unknown>>) {
    this.shortTerm.set(key, value);
  }
  async getSummary(key: string) {
    return this.summaries.get(key) ?? null;
  }
  async setSummary(key: string, summary: string) {
    this.summaries.set(key, summary);
  }
  async retrieve(_query: string): Promise<readonly unknown[]> {
    // Vector / long-term memory is intentionally not implemented in M6.5.
    return [];
  }
}
