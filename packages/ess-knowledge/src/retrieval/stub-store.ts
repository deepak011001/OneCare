import { STUB_KNOWLEDGE_DOCUMENTS } from './stub-corpus';
import type {
  KnowledgeDocument,
  KnowledgeRetrievalPort,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
} from './types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function scoreDocument(doc: KnowledgeDocument, query: KnowledgeSearchQuery): number {
  const qTokens = tokenize(query.text);
  if (qTokens.length === 0 && !query.domain && !query.category && !query.documentIds?.length) {
    return 0;
  }

  let score = 0;
  const faqText = (doc.faqs ?? []).join(' ');
  const hay = tokenize(
    [doc.title, doc.summary, doc.body, ...doc.topics, ...doc.tags, doc.section ?? '', faqText].join(
      ' ',
    ),
  );
  const queryLower = query.text.toLowerCase();

  for (const token of qTokens) {
    if (hay.includes(token)) score += 2;
    if (doc.topics.some((t) => t.toLowerCase().includes(token))) score += 3;
    if (doc.title.toLowerCase().includes(token)) score += 4;
  }

  // FAQ / paraphrase match — employees ask the same question many ways
  for (const faq of doc.faqs ?? []) {
    const faqLower = faq.toLowerCase();
    if (faqLower === queryLower || queryLower.includes(faqLower) || faqLower.includes(queryLower)) {
      score += 12;
    } else {
      const faqTokens = tokenize(faq);
      const overlap = faqTokens.filter((t) => qTokens.includes(t)).length;
      if (overlap >= 2) score += overlap * 2;
    }
  }

  if (query.domain && doc.domain === query.domain) score += 5;
  if (query.category && doc.category === query.category) score += 5;
  if (query.country && doc.country && doc.country.toLowerCase() === query.country.toLowerCase()) {
    score += 3;
  }
  if (query.topics?.length) {
    for (const topic of query.topics) {
      if (doc.topics.some((t) => t.toLowerCase().includes(topic.toLowerCase()))) score += 4;
    }
  }
  if (query.documentIds?.includes(doc.id)) score += 10;

  return score;
}

/**
 * In-memory / markdown-JSON stub retrieval — replaceable with Azure AI Search, pgvector, etc.
 */
export class StubKnowledgeStore implements KnowledgeRetrievalPort {
  readonly engineId = 'stub-memory';

  constructor(
    private readonly documents: readonly KnowledgeDocument[] = STUB_KNOWLEDGE_DOCUMENTS,
  ) {}

  async search(query: KnowledgeSearchQuery): Promise<KnowledgeSearchResult> {
    const started = Date.now();
    const limit = query.limit ?? 5;

    if (query.documentIds?.length) {
      const hits = query.documentIds
        .map((id) => this.documents.find((d) => d.id === id))
        .filter((d): d is KnowledgeDocument => Boolean(d))
        .map((document) => ({
          document,
          score: 1,
          ...(document.section ? { matchedSection: document.section } : {}),
        }));
      return { hits, engine: this.engineId, tookMs: Date.now() - started };
    }

    const ranked = this.documents
      .map((document) => ({
        document,
        score: scoreDocument(document, query),
        ...(document.section ? { matchedSection: document.section } : {}),
      }))
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { hits: ranked, engine: this.engineId, tookMs: Date.now() - started };
  }

  async getById(documentId: string): Promise<KnowledgeDocument | null> {
    return this.documents.find((d) => d.id === documentId) ?? null;
  }

  async listRelated(documentId: string, limit = 5): Promise<readonly KnowledgeDocument[]> {
    const doc = await this.getById(documentId);
    if (!doc?.relatedIds?.length) return [];
    const related: KnowledgeDocument[] = [];
    for (const id of doc.relatedIds) {
      const item = await this.getById(id);
      if (item) related.push(item);
      if (related.length >= limit) break;
    }
    return related;
  }

  async listPopular(limit = 8): Promise<readonly KnowledgeDocument[]> {
    return this.documents.slice(0, limit);
  }

  async listCategories(): Promise<readonly { domain: string; category: string; count: number }[]> {
    const map = new Map<string, number>();
    for (const doc of this.documents) {
      const key = `${doc.domain}:${doc.category}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, count]) => {
      const [domain, category] = key.split(':');
      return { domain: domain!, category: category!, count };
    });
  }
}

export function createStubKnowledgeStore(
  documents?: readonly KnowledgeDocument[],
): StubKnowledgeStore {
  return new StubKnowledgeStore(documents);
}
