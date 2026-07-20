import type { ExtractedMetadata, NormalizedDocument } from './types';
import type { MetadataExtractorPort } from './ports';

const COUNTRY_HINTS = ['india', 'us', 'usa', 'uk', 'uae', 'singapore', 'germany'];
const LEAVE_HINTS = ['annual', 'sick', 'casual', 'maternity', 'paternity', 'pto', 'wfh'];
const BENEFIT_HINTS = ['insurance', 'medical', 'dental', '401k', 'pf', 'gratuity', 'wellness'];

export class HeuristicMetadataExtractor implements MetadataExtractorPort {
  extract(document: NormalizedDocument): ExtractedMetadata {
    const hay = `${document.title}\n${document.body}`.toLowerCase();
    const keywords = unique(
      tokenize(hay)
        .filter((t) => t.length > 3)
        .slice(0, 40),
    );

    return {
      keywords,
      departments: matchMany(hay, ['hr', 'it', 'finance', 'legal', 'engineering', 'people']),
      countries: COUNTRY_HINTS.filter((c) => hay.includes(c)),
      policies: document.title.toLowerCase().includes('policy') ? [document.title] : [],
      benefits: BENEFIT_HINTS.filter((b) => hay.includes(b)),
      leaveTypes: LEAVE_HINTS.filter((l) => hay.includes(l)),
      applications: matchMany(hay, ['keka', 'workday', 'successfactors', 'outlook', 'teams']),
      projects: [],
      products: matchMany(hay, ['onecare', 'payroll', 'attendance', 'leave']),
      teams: [],
      people: [],
      locations: matchMany(hay, ['bangalore', 'hyderabad', 'remote', 'office']),
      customTags: [...document.headings].slice(0, 10),
      domain: inferDomain(hay),
      category: inferCategory(hay, document.documentType),
      topics: unique([...document.headings.map((h) => h.toLowerCase()), ...keywords.slice(0, 8)]),
    };
  }
}

function tokenize(text: string): string[] {
  return text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function matchMany(hay: string, candidates: readonly string[]): string[] {
  return candidates.filter((c) => hay.includes(c));
}

function inferDomain(hay: string): string {
  if (/\bleave\b|\bwfh\b|\bholiday\b|\bhr\b|\btravel\b|\bpolicy\b|\bmaternity\b/.test(hay)) {
    return 'hr';
  }
  if (/\bvpn\b|\blaptop\b|\bit\b|\bpassword\b/.test(hay)) return 'it';
  if (/\breimburse\b|\bexpense\b|\bfinance\b|\binvoice\b/.test(hay)) return 'finance';
  if (/\blearn\b|\btraining\b|\bcourse\b/.test(hay)) return 'learning';
  return 'company';
}

function inferCategory(hay: string, documentType: string): string {
  if (documentType === 'faq') return 'faq';
  if (/\btravel\b/.test(hay)) return 'travel';
  if (/\bleave\b/.test(hay)) return 'leave';
  if (/\bbenefit\b|\binsurance\b/.test(hay)) return 'benefits';
  return documentType || 'general';
}
