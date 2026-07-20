import type { KnowledgeDocument, KnowledgeSearchHit } from './retrieval/types';
import type {
  AnswerFormat,
  KnowledgeAnswer,
  KnowledgeAnswerPart,
  KnowledgeRequest,
  KnowledgeSourceAttribution,
} from './types';

function attribution(
  doc: KnowledgeDocument,
  confidence: number,
  section?: string,
): KnowledgeSourceAttribution {
  return {
    documentId: doc.id,
    title: doc.title,
    ...(section || doc.section ? { section: section ?? doc.section } : {}),
    ...(doc.lastUpdated ? { lastUpdated: doc.lastUpdated } : {}),
    documentType: doc.documentType,
    confidence,
    ...(doc.url ? { url: doc.url } : {}),
  };
}

function pickFormat(request: KnowledgeRequest, doc: KnowledgeDocument | undefined): AnswerFormat {
  const text = request.text.toLowerCase();
  if (/\bstep|how do i|how does\b/.test(text)) return 'steps';
  if (/\bcompare|vs\b/.test(text)) return 'comparison';
  if (/\btimeline|when\b/.test(text) && doc?.documentType === 'guide') return 'timeline';
  if (/\blist|types|what are\b/.test(text)) return 'bullets';
  if (doc?.body && doc.body.length > 400) return 'summary';
  return 'answer';
}

function toBullets(body: string): string[] {
  return body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((l) => l.replace(/^[•\-]\s*/, ''));
}

function toSteps(body: string): string[] {
  const lines = toBullets(body);
  return lines.map((l, i) => `${i + 1}. ${l}`);
}

/**
 * Compose a professional HR-style answer grounded only in the retrieved document.
 * Never invent policy text beyond the source.
 */
function composeProfessionalHrAnswer(input: {
  readonly request: KnowledgeRequest;
  readonly doc: KnowledgeDocument;
  readonly format: AnswerFormat;
  readonly bullets?: readonly string[];
  readonly steps?: readonly string[];
}): string {
  const { request, doc, format, bullets, steps } = input;
  const lead = doc.summary.trim();
  const closing =
    'This answer is based on the company knowledge base. For your specific case, HR or your manager can confirm.';

  if (format === 'steps' && steps?.length) {
    return [
      `Regarding your question (“${trimQuestion(request.text)}”), here is the guidance from **${doc.title}**:`,
      '',
      lead,
      '',
      'Steps:',
      ...steps,
      '',
      closing,
    ].join('\n');
  }

  if ((format === 'bullets' || format === 'summary') && bullets?.length) {
    return [
      `Here is what **${doc.title}** says about your question:`,
      '',
      lead,
      '',
      'Key points:',
      ...bullets.map((b) => `• ${b}`),
      '',
      closing,
    ].join('\n');
  }

  const detail = doc.body.trim();
  return [
    `Here is what **${doc.title}** covers:`,
    '',
    lead,
    '',
    detail,
    '',
    closing,
  ].join('\n');
}

function trimQuestion(text: string): string {
  return text.replace(/\?+$/, '').trim();
}

function buildPart(
  request: KnowledgeRequest,
  hits: readonly KnowledgeSearchHit[],
): KnowledgeAnswerPart {
  const top = hits[0];
  if (!top) {
    return {
      requestId: request.id,
      format: 'answer',
      text: `I could not find a documented company source for “${trimQuestion(request.text)}”. I will not invent an HR policy answer. Try rephrasing, ask about a related policy, or browse knowledge categories.`,
      sources: [],
      confidence: 0,
      found: false,
      suggestedFollowUps: [
        'Show popular knowledge questions',
        'What knowledge topics can you help with?',
      ],
    };
  }

  const doc = top.document;
  const confidence = Math.min(0.95, top.score / 20);
  const format = pickFormat(request, doc);
  const source = attribution(doc, confidence, top.matchedSection);
  const bullets = format === 'bullets' || format === 'summary' ? toBullets(doc.body) : undefined;
  const steps = format === 'steps' ? toSteps(doc.body) : undefined;

  const text = composeProfessionalHrAnswer({
    request,
    doc,
    format,
    ...(bullets ? { bullets } : {}),
    ...(steps ? { steps } : {}),
  });

  return {
    requestId: request.id,
    format,
    title: doc.title,
    text,
    ...(bullets ? { bullets } : {}),
    ...(steps ? { steps } : {}),
    sources: [source],
    relatedTopics: doc.topics.slice(0, 5),
    relatedDocumentIds: doc.relatedIds?.slice(0, 5) ?? [],
    suggestedFollowUps: (doc.faqs ?? []).slice(0, 3),
    confidence,
    found: true,
  };
}

export function buildKnowledgeAnswer(input: {
  readonly requests: readonly KnowledgeRequest[];
  readonly hitsByRequest: ReadonlyMap<string, readonly KnowledgeSearchHit[]>;
  readonly relatedDocs?: readonly KnowledgeDocument[];
}): KnowledgeAnswer {
  const parts = input.requests.map((req) => buildPart(req, input.hitsByRequest.get(req.id) ?? []));

  const sourcesMap = new Map<string, KnowledgeSourceAttribution>();
  for (const part of parts) {
    for (const source of part.sources) {
      sourcesMap.set(source.documentId, source);
    }
  }

  const relatedDocuments =
    input.relatedDocs?.map((d) => ({ id: d.id, title: d.title })) ??
    parts
      .flatMap((p) => p.relatedDocumentIds ?? [])
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .slice(0, 5)
      .map((id) => {
        const hit = [...input.hitsByRequest.values()].flat().find((h) => h.document.id === id);
        return hit ? { id, title: hit.document.title } : { id, title: id };
      });

  const relatedPolicies = parts
    .flatMap((p) => p.relatedTopics ?? [])
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 6);

  const faqs = parts
    .flatMap((p) => p.suggestedFollowUps ?? [])
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 6);

  const suggestedFollowUps = faqs.slice(0, 4);
  const confidence =
    parts.length === 0 ? 0 : parts.reduce((sum, p) => sum + p.confidence, 0) / parts.length;

  const multiIntent = parts.length > 1;
  const text = parts
    .map((part, index) => {
      const header = multiIntent
        ? `### ${index + 1}. ${part.title ?? 'Answer'}\n`
        : '';
      return `${header}${part.text}`;
    })
    .join('\n\n');

  return {
    text,
    parts,
    sources: [...sourcesMap.values()],
    relatedPolicies,
    relatedDocuments,
    faqs,
    suggestedFollowUps,
    confidence,
    multiIntent,
  };
}

export function formatKnowledgeAnswerMessage(answer: KnowledgeAnswer): string {
  const sources =
    answer.sources.length > 0
      ? `\n\nSources:\n${answer.sources
          .map((s) => {
            const conf =
              typeof s.confidence === 'number' ? ` (${Math.round(s.confidence * 100)}%)` : '';
            const updated = s.lastUpdated ? ` · updated ${s.lastUpdated}` : '';
            return `• ${s.title}${conf}${updated}`;
          })
          .join('\n')}`
      : '';
  const related =
    answer.relatedDocuments && answer.relatedDocuments.length > 0
      ? `\n\nRelated documents: ${answer.relatedDocuments.map((d) => d.title).join(', ')}`
      : '';
  const followUps =
    answer.suggestedFollowUps && answer.suggestedFollowUps.length > 0
      ? `\n\nYou might also ask:\n${answer.suggestedFollowUps.map((q) => `• ${q}`).join('\n')}`
      : '';
  return `${answer.text}${sources}${related}${followUps}`;
}
