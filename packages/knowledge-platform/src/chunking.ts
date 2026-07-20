import type {
  ChunkingStrategy,
  DocumentChunk,
  ExtractedMetadata,
  NormalizedDocument,
} from './types';
import type { ChunkerPort } from './ports';

export interface ChunkerOptions {
  readonly strategy?: ChunkingStrategy;
  readonly maxChars?: number;
  readonly overlapChars?: number;
}

export class ConfigurableChunker implements ChunkerPort {
  readonly strategy: ChunkingStrategy;
  private readonly maxChars: number;
  private readonly overlapChars: number;

  constructor(options: ChunkerOptions = {}) {
    this.strategy = options.strategy ?? 'paragraph';
    this.maxChars = options.maxChars ?? 900;
    this.overlapChars = options.overlapChars ?? 120;
  }

  chunk(document: NormalizedDocument, metadata: ExtractedMetadata): readonly DocumentChunk[] {
    const pieces = this.split(document);
    const chunks: DocumentChunk[] = [];
    let ordinal = 0;

    for (const piece of pieces) {
      const windows = windowText(piece.text, this.maxChars, this.overlapChars);
      for (const text of windows) {
        chunks.push({
          id: `${document.id}:chunk:${ordinal}`,
          documentId: document.id,
          version: document.version,
          ordinal,
          text,
          ...(piece.heading ? { heading: piece.heading } : {}),
          strategy: this.strategy,
          tokenEstimate: Math.ceil(text.length / 4),
          acl: document.acl,
          metadata,
          sourceSystem: document.sourceSystem,
          lastModified: document.lastModified,
        });
        ordinal += 1;
      }
    }

    return chunks;
  }

  private split(document: NormalizedDocument): { heading?: string; text: string }[] {
    switch (this.strategy) {
      case 'heading':
      case 'semantic':
      case 'table_aware':
        if (document.sections.length) {
          return document.sections.map((s) => ({
            ...(s.heading ? { heading: s.heading } : {}),
            text: [s.heading, s.body].filter(Boolean).join('\n'),
          }));
        }
        return [{ text: `${document.title}\n${document.body}` }];
      case 'paragraph':
        return document.body
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((text) => ({ text: `${document.title}\n${text}` }));
      case 'sliding_window':
      case 'token':
      default:
        return [{ text: `${document.title}\n${document.body}` }];
    }
  }
}

function windowText(text: string, maxChars: number, overlap: number): string[] {
  if (text.length <= maxChars) return [text];
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + maxChars);
    out.push(text.slice(start, end));
    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }
  return out;
}
