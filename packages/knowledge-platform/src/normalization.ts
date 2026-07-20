import type {
  ConnectorDocument,
  DocumentAcl,
  KnowledgeSourceConfig,
  NormalizedDocument,
} from './types';
import type { NormalizerPort } from './ports';
import { createFingerprint } from './acl';

export class DefaultNormalizer implements NormalizerPort {
  normalize(input: {
    readonly tenantId: string;
    readonly source: KnowledgeSourceConfig;
    readonly document: ConnectorDocument;
    readonly acl: DocumentAcl;
    readonly version: number;
  }): NormalizedDocument {
    const doc = input.document;
    const sections =
      doc.sections?.map((s, i) => ({
        id: `${doc.externalId}:sec:${i}`,
        ...(s.heading ? { heading: s.heading } : {}),
        body: s.body,
        order: i,
      })) ??
      splitSections(doc.body).map((s, i) => ({
        id: `${doc.externalId}:sec:${i}`,
        ...(s.heading ? { heading: s.heading } : {}),
        body: s.body,
        order: i,
      }));

    const headings = sections.map((s) => s.heading).filter((h): h is string => Boolean(h));
    const fingerprint = createFingerprint([
      doc.externalId,
      doc.title,
      doc.body,
      doc.lastModified,
      String(doc.versionHint ?? input.version),
    ]);

    return {
      id: `${input.tenantId}:${input.source.id}:${doc.externalId}`,
      sourceSystem: input.source.connectorType,
      ...(doc.sourceUri ? { sourceUri: doc.sourceUri } : {}),
      externalId: doc.externalId,
      title: doc.title.trim(),
      body: doc.body,
      sections,
      headings,
      tables: extractBlocks(doc.body, /\|.+\|/g),
      lists: extractBlocks(doc.body, /^[\s]*[-*•]\s+.+$/gm),
      links: extractBlocks(doc.body, /https?:\/\/\S+/g),
      attachments: [],
      ...(doc.owner ? { owner: doc.owner } : {}),
      documentType: inferDocumentType(doc.title, doc.contentType),
      lastModified: doc.lastModified,
      fingerprint,
      version: doc.versionHint ?? input.version,
      status: doc.deleted ? 'soft_deleted' : 'active',
      acl: input.acl,
      ...(doc.contentType ? { rawContentType: doc.contentType } : {}),
    };
  }
}

function splitSections(body: string): { heading?: string; body: string }[] {
  const parts = body.split(/\n(?=#{1,3}\s)/);
  if (parts.length <= 1) {
    return [{ body }];
  }
  return parts.map((part) => {
    const match = part.match(/^#{1,3}\s+(.+)\n([\s\S]*)$/);
    if (!match) return { body: part };
    return { heading: match[1]!.trim(), body: match[2]!.trim() };
  });
}

function extractBlocks(body: string, pattern: RegExp): string[] {
  return [...body.matchAll(pattern)].map((m) => m[0]!).slice(0, 50);
}

function inferDocumentType(title: string, contentType?: string): string {
  const t = title.toLowerCase();
  if (t.includes('faq')) return 'faq';
  if (t.includes('policy')) return 'policy';
  if (t.includes('handbook')) return 'handbook';
  if (t.includes('guide') || t.includes('how to')) return 'guide';
  if (contentType?.includes('pdf')) return 'policy';
  return 'other';
}
