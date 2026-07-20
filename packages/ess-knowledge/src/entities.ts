import {
  CommonEntities,
  extractDeclaredEntities,
  mergeSlotBags,
  type EntityDeclaration,
  type SlotBag,
} from '@onecare/ess-capability';
import type { KnowledgeSlots } from './types';

export const KNOWLEDGE_ENTITIES: readonly EntityDeclaration[] = [
  CommonEntities.policyName,
  CommonEntities.document,
  CommonEntities.department,
  CommonEntities.location,
  CommonEntities.benefit,
  CommonEntities.leaveType,
  CommonEntities.role,
  CommonEntities.country,
  CommonEntities.office,
  CommonEntities.manager,
  CommonEntities.keyword,
  CommonEntities.employee,
  CommonEntities.dateRange,
];

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function asKnowledgeSlots(slots: SlotBag): KnowledgeSlots {
  const result: KnowledgeSlots = {};
  const policyName = pickString(slots.policyName);
  const department = pickString(slots.department);
  const location = pickString(slots.location);
  const benefit = pickString(slots.benefit);
  const leaveType = pickString(slots.leaveType);
  const role = pickString(slots.role);
  const country = pickString(slots.country);
  const office = pickString(slots.office);
  const document = pickString(slots.document);
  const manager = pickString(slots.manager);
  const keyword = pickString(slots.keyword);
  const query = pickString(slots.query);
  const topic = pickString(slots.topic);
  const lastTopic = pickString(slots.lastTopic);

  if (policyName) (result as { policyName: string }).policyName = policyName;
  if (department) (result as { department: string }).department = department;
  if (location) (result as { location: string }).location = location;
  if (benefit) (result as { benefit: string }).benefit = benefit;
  if (leaveType) (result as { leaveType: string }).leaveType = leaveType;
  if (role) (result as { role: string }).role = role;
  if (country) (result as { country: string }).country = country;
  if (office) (result as { office: string }).office = office;
  if (document) (result as { document: string }).document = document;
  if (manager) (result as { manager: string }).manager = manager;
  if (keyword) (result as { keyword: string }).keyword = keyword;
  if (query) (result as { query: string }).query = query;
  if (topic) (result as { topic: string }).topic = topic;
  if (lastTopic) (result as { lastTopic: string }).lastTopic = lastTopic;

  if (typeof slots.domain === 'string') {
    (result as { domain: KnowledgeSlots['domain'] }).domain =
      slots.domain as KnowledgeSlots['domain'];
  }
  if (typeof slots.category === 'string') {
    (result as { category: KnowledgeSlots['category'] }).category =
      slots.category as KnowledgeSlots['category'];
  }
  if (Array.isArray(slots.lastDocumentIds)) {
    (result as { lastDocumentIds: string[] }).lastDocumentIds = slots.lastDocumentIds as string[];
  }
  if (typeof slots.lastDomain === 'string') {
    (result as { lastDomain: KnowledgeSlots['lastDomain'] }).lastDomain =
      slots.lastDomain as KnowledgeSlots['lastDomain'];
  }
  if (typeof slots.lastCategory === 'string') {
    (result as { lastCategory: KnowledgeSlots['lastCategory'] }).lastCategory =
      slots.lastCategory as KnowledgeSlots['lastCategory'];
  }

  return result;
}

export function toSlotBag(slots: KnowledgeSlots): SlotBag {
  return { ...slots };
}

export function extractKnowledgeEntities(
  message: string,
  prior: KnowledgeSlots = {},
  now: Date = new Date(),
): KnowledgeSlots {
  const extracted = extractDeclaredEntities(KNOWLEDGE_ENTITIES, message, toSlotBag(prior), now);
  return asKnowledgeSlots(mergeSlotBags(toSlotBag(prior), extracted));
}

export function mergeKnowledgeSlots(prior: KnowledgeSlots, next: KnowledgeSlots): KnowledgeSlots {
  return { ...prior, ...next };
}
