import { createHash, randomUUID } from 'node:crypto';
import type {
  AdminKnowledgeDocument,
  ApprovalRequest,
  DocumentFormat,
  DocumentStatus,
  KnowledgeAdminActor,
  KnowledgeAdminSettings,
  KnowledgeAnalyticsSnapshot,
  KnowledgeCategory,
  KnowledgeCollection,
  KnowledgeFolder,
  KnowledgeHealthSnapshot,
  KnowledgeTag,
  PlaygroundResult,
} from './types';

function nowIso(): string {
  return new Date().toISOString();
}

function fingerprint(parts: readonly string[]): string {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 24);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3));
}

function emptyStatusCounts(): Record<DocumentStatus, number> {
  return {
    draft: 0,
    review: 0,
    approved: 0,
    published: 0,
    archived: 0,
    expired: 0,
  };
}

export interface KnowledgeAdminStoreSnapshot {
  readonly folders: readonly KnowledgeFolder[];
  readonly documents: readonly AdminKnowledgeDocument[];
  readonly categories: readonly KnowledgeCategory[];
  readonly tags: readonly KnowledgeTag[];
  readonly collections: readonly KnowledgeCollection[];
  readonly approvals: readonly ApprovalRequest[];
  readonly settings: KnowledgeAdminSettings;
}

/**
 * In-memory tenant-scoped Knowledge Admin workspace.
 * Production can swap to Prisma adapters without changing the application service API.
 */
export class InMemoryKnowledgeAdminStore {
  private readonly folders = new Map<string, KnowledgeFolder>();
  private readonly documents = new Map<string, AdminKnowledgeDocument>();
  private readonly categories = new Map<string, KnowledgeCategory>();
  private readonly tags = new Map<string, KnowledgeTag>();
  private readonly collections = new Map<string, KnowledgeCollection>();
  private readonly approvals = new Map<string, ApprovalRequest>();
  private settings: KnowledgeAdminSettings;

  constructor(private readonly tenantId: string) {
    this.settings = {
      tenantId,
      maxUploadBytes: 25 * 1024 * 1024,
      allowedFormats: [
        'markdown',
        'html',
        'richtext',
        'pdf',
        'docx',
        'pptx',
        'xlsx',
        'csv',
        'txt',
        'image',
      ],
      requireApproval: true,
      defaultVisibility: 'public',
      autoExpireDays: 365,
    };
  }

  seedDefaults(actor: KnowledgeAdminActor): void {
    if (this.folders.size > 0) return;
    const roots = ['HR', 'IT', 'Finance', 'Company', 'Learning', 'Legal'];
    const rootIds = new Map<string, string>();
    for (const name of roots) {
      const folder = this.createFolder(actor, { name, parentId: null });
      rootIds.set(name, folder.id);
    }
    const hrId = rootIds.get('HR')!;
    for (const name of ['Leave', 'Attendance', 'Payroll', 'Benefits', 'Policies']) {
      this.createFolder(actor, { name, parentId: hrId });
    }
    for (const name of [
      'HR',
      'Payroll',
      'Leave',
      'Attendance',
      'Benefits',
      'Recruitment',
      'Learning',
      'IT',
      'Finance',
      'Travel',
      'Security',
      'Compliance',
      'Culture',
      'General',
    ]) {
      this.createCategory(actor, { name });
    }
    for (const [name, color] of [
      ['policy', '#c9853f'],
      ['handbook', '#4a90a4'],
      ['urgent', '#c45c4a'],
      ['india', '#5a8f5a'],
    ] as const) {
      this.createTag(actor, { name, color });
    }

    const leaveCat = [...this.categories.values()].find((c) => c.slug === 'leave');
    const policyTag = [...this.tags.values()].find((t) => t.name === 'policy');
    const leaveFolder = [...this.folders.values()].find((f) => f.name === 'Leave');

    const doc = this.createDocument(actor, {
      title: 'Leave Policy (Draft)',
      description: 'Working draft for HR review before publish.',
      body: `Employees receive Annual, Casual, and Sick leave as per role and tenure.
Leave requests are submitted in OneCare and approved by the reporting manager.
Carry-forward of Annual leave is capped per country calendar year.`,
      summary: 'Draft leave entitlements and approval flow.',
      format: 'markdown',
      folderId: leaveFolder?.id ?? null,
      categoryIds: leaveCat ? [leaveCat.id] : [],
      tagIds: policyTag ? [policyTag.id] : [],
    });

    this.createCollection(actor, {
      name: 'New Employee',
      description: 'Onboarding essentials',
      documentIds: [doc.id],
    });
  }

  getSettings(): KnowledgeAdminSettings {
    return this.settings;
  }

  updateSettings(patch: Partial<KnowledgeAdminSettings>): KnowledgeAdminSettings {
    this.settings = {
      ...this.settings,
      ...patch,
      tenantId: this.tenantId,
      allowedFormats: patch.allowedFormats ?? this.settings.allowedFormats,
    };
    return this.settings;
  }

  listFolders(): readonly KnowledgeFolder[] {
    return [...this.folders.values()].filter((f) => f.tenantId === this.tenantId);
  }

  createFolder(
    actor: KnowledgeAdminActor,
    input: { name: string; parentId: string | null },
  ): KnowledgeFolder {
    this.assertTenant(actor);
    if (input.parentId) {
      const parent = this.folders.get(input.parentId);
      if (!parent || parent.tenantId !== this.tenantId) {
        throw new Error('Parent folder not found');
      }
    }
    const parentPath = input.parentId ? (this.folders.get(input.parentId)?.path ?? '') : '';
    const path = parentPath ? `${parentPath}/${input.name}` : `/${input.name}`;
    const folder: KnowledgeFolder = {
      id: randomUUID(),
      tenantId: this.tenantId,
      parentId: input.parentId,
      name: input.name.trim(),
      path,
      status: 'active',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: actor.userId,
    };
    this.folders.set(folder.id, folder);
    return folder;
  }

  renameFolder(actor: KnowledgeAdminActor, folderId: string, name: string): KnowledgeFolder {
    this.assertTenant(actor);
    const folder = this.requireFolder(folderId);
    const updated: KnowledgeFolder = {
      ...folder,
      name: name.trim(),
      path: folder.parentId
        ? `${this.folders.get(folder.parentId)?.path ?? ''}/${name.trim()}`
        : `/${name.trim()}`,
      updatedAt: nowIso(),
    };
    this.folders.set(folderId, updated);
    return updated;
  }

  moveFolder(
    actor: KnowledgeAdminActor,
    folderId: string,
    parentId: string | null,
  ): KnowledgeFolder {
    this.assertTenant(actor);
    const folder = this.requireFolder(folderId);
    if (parentId === folderId) throw new Error('Cannot move folder into itself');
    if (parentId) this.requireFolder(parentId);
    const parentPath = parentId ? (this.folders.get(parentId)?.path ?? '') : '';
    const updated: KnowledgeFolder = {
      ...folder,
      parentId,
      path: parentPath ? `${parentPath}/${folder.name}` : `/${folder.name}`,
      updatedAt: nowIso(),
    };
    this.folders.set(folderId, updated);
    return updated;
  }

  archiveFolder(actor: KnowledgeAdminActor, folderId: string): KnowledgeFolder {
    this.assertTenant(actor);
    const folder = this.requireFolder(folderId);
    const updated: KnowledgeFolder = { ...folder, status: 'archived', updatedAt: nowIso() };
    this.folders.set(folderId, updated);
    return updated;
  }

  deleteFolder(actor: KnowledgeAdminActor, folderId: string): void {
    this.assertTenant(actor);
    this.requireFolder(folderId);
    const hasChildren = [...this.folders.values()].some((f) => f.parentId === folderId);
    if (hasChildren) throw new Error('Folder has children');
    const hasDocs = [...this.documents.values()].some((d) => d.folderId === folderId);
    if (hasDocs) throw new Error('Folder contains documents');
    this.folders.delete(folderId);
  }

  listCategories(): readonly KnowledgeCategory[] {
    return [...this.categories.values()];
  }

  createCategory(
    actor: KnowledgeAdminActor,
    input: { name: string; description?: string; parentId?: string | null },
  ): KnowledgeCategory {
    this.assertTenant(actor);
    const cat: KnowledgeCategory = {
      id: randomUUID(),
      tenantId: this.tenantId,
      name: input.name.trim(),
      slug: slugify(input.name),
      ...(input.description ? { description: input.description } : {}),
      parentId: input.parentId ?? null,
      createdAt: nowIso(),
    };
    this.categories.set(cat.id, cat);
    return cat;
  }

  deleteCategory(actor: KnowledgeAdminActor, categoryId: string): void {
    this.assertTenant(actor);
    if (!this.categories.has(categoryId)) throw new Error('Category not found');
    this.categories.delete(categoryId);
  }

  listTags(): readonly KnowledgeTag[] {
    return [...this.tags.values()];
  }

  createTag(
    actor: KnowledgeAdminActor,
    input: { name: string; color: string; parentId?: string | null },
  ): KnowledgeTag {
    this.assertTenant(actor);
    const tag: KnowledgeTag = {
      id: randomUUID(),
      tenantId: this.tenantId,
      name: input.name.trim().toLowerCase(),
      color: input.color,
      parentId: input.parentId ?? null,
      createdAt: nowIso(),
    };
    this.tags.set(tag.id, tag);
    return tag;
  }

  deleteTag(actor: KnowledgeAdminActor, tagId: string): void {
    this.assertTenant(actor);
    if (!this.tags.has(tagId)) throw new Error('Tag not found');
    this.tags.delete(tagId);
  }

  listCollections(): readonly KnowledgeCollection[] {
    return [...this.collections.values()];
  }

  createCollection(
    actor: KnowledgeAdminActor,
    input: { name: string; description?: string; documentIds?: readonly string[] },
  ): KnowledgeCollection {
    this.assertTenant(actor);
    const collection: KnowledgeCollection = {
      id: randomUUID(),
      tenantId: this.tenantId,
      name: input.name.trim(),
      ...(input.description ? { description: input.description } : {}),
      documentIds: input.documentIds ?? [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.collections.set(collection.id, collection);
    return collection;
  }

  updateCollection(
    actor: KnowledgeAdminActor,
    collectionId: string,
    patch: { name?: string; description?: string; documentIds?: readonly string[] },
  ): KnowledgeCollection {
    this.assertTenant(actor);
    const current = this.collections.get(collectionId);
    if (!current) throw new Error('Collection not found');
    const next: KnowledgeCollection = {
      ...current,
      name: patch.name?.trim() ?? current.name,
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      documentIds: patch.documentIds ?? current.documentIds,
      updatedAt: nowIso(),
    };
    this.collections.set(collectionId, next);
    return next;
  }

  listDocuments(filter?: {
    status?: DocumentStatus;
    folderId?: string | null;
    q?: string;
  }): readonly AdminKnowledgeDocument[] {
    let docs = [...this.documents.values()];
    if (filter?.status) docs = docs.filter((d) => d.status === filter.status);
    if (filter?.folderId !== undefined) {
      docs = docs.filter((d) => d.folderId === filter.folderId);
    }
    if (filter?.q) {
      const q = filter.q.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.body.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q),
      );
    }
    return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getDocument(documentId: string): AdminKnowledgeDocument | null {
    return this.documents.get(documentId) ?? null;
  }

  createDocument(
    actor: KnowledgeAdminActor,
    input: {
      title: string;
      description?: string;
      body: string;
      summary?: string;
      format?: DocumentFormat;
      folderId?: string | null;
      categoryIds?: readonly string[];
      tagIds?: readonly string[];
      language?: string;
      department?: string;
    },
  ): AdminKnowledgeDocument {
    this.assertTenant(actor);
    const title = input.title.trim();
    const body = input.body.trim();
    const summary = (input.summary ?? body.slice(0, 180)).trim();
    const fp = fingerprint([title, body]);
    const version = {
      version: 1,
      title,
      body,
      summary,
      createdAt: nowIso(),
      createdBy: actor.userId,
      changeNote: 'Initial draft',
      fingerprint: fp,
    };
    const doc: AdminKnowledgeDocument = {
      id: randomUUID(),
      tenantId: this.tenantId,
      folderId: input.folderId ?? null,
      title,
      description: (input.description ?? '').trim(),
      body,
      summary,
      format: input.format ?? 'markdown',
      language: input.language ?? 'en',
      status: 'draft',
      version: 1,
      versions: [version],
      categoryIds: input.categoryIds ?? [],
      tagIds: input.tagIds ?? [],
      collectionIds: [],
      ...(input.department ? { department: input.department } : {}),
      ownerUserId: actor.userId,
      acl: {
        tenantId: this.tenantId,
        visibility: this.settings.defaultVisibility,
        ownerUserIds: [actor.userId],
      },
      source: 'manual',
      chunkCount: Math.max(1, Math.ceil(body.length / 800)),
      tokenEstimate: estimateTokens(body),
      fingerprint: fp,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    };
    this.documents.set(doc.id, doc);
    return doc;
  }

  updateDocument(
    actor: KnowledgeAdminActor,
    documentId: string,
    patch: {
      title?: string;
      description?: string;
      body?: string;
      summary?: string;
      folderId?: string | null;
      categoryIds?: readonly string[];
      tagIds?: readonly string[];
      changeNote?: string;
    },
  ): AdminKnowledgeDocument {
    this.assertTenant(actor);
    const current = this.requireDocument(documentId);
    if (current.status === 'published') {
      // edits create a new draft version while keeping published snapshot in history
    }
    const title = patch.title?.trim() ?? current.title;
    const body = patch.body?.trim() ?? current.body;
    const summary = patch.summary?.trim() ?? current.summary;
    const fp = fingerprint([title, body]);
    const nextVersion = current.version + 1;
    const versionEntry = {
      version: nextVersion,
      title,
      body,
      summary,
      createdAt: nowIso(),
      createdBy: actor.userId,
      ...(patch.changeNote
        ? { changeNote: patch.changeNote }
        : { changeNote: `Update v${nextVersion}` }),
      fingerprint: fp,
    };
    const updated: AdminKnowledgeDocument = {
      ...current,
      title,
      description: patch.description ?? current.description,
      body,
      summary,
      folderId: patch.folderId !== undefined ? patch.folderId : current.folderId,
      categoryIds: patch.categoryIds ?? current.categoryIds,
      tagIds: patch.tagIds ?? current.tagIds,
      version: nextVersion,
      versions: [...current.versions, versionEntry],
      status: current.status === 'published' ? 'draft' : current.status,
      fingerprint: fp,
      chunkCount: Math.max(1, Math.ceil(body.length / 800)),
      tokenEstimate: estimateTokens(body),
      updatedAt: nowIso(),
      updatedBy: actor.userId,
    };
    this.documents.set(documentId, updated);
    return updated;
  }

  transitionStatus(
    actor: KnowledgeAdminActor,
    documentId: string,
    status: DocumentStatus,
  ): AdminKnowledgeDocument {
    this.assertTenant(actor);
    const current = this.requireDocument(documentId);
    const allowed: Record<DocumentStatus, readonly DocumentStatus[]> = {
      draft: ['review', 'archived'],
      review: ['approved', 'draft', 'archived'],
      approved: ['published', 'review', 'archived'],
      published: ['archived', 'expired', 'draft'],
      archived: ['draft'],
      expired: ['draft', 'archived'],
    };
    if (!allowed[current.status].includes(status)) {
      throw new Error(`Cannot transition from ${current.status} to ${status}`);
    }
    const updated: AdminKnowledgeDocument = {
      ...current,
      status,
      updatedAt: nowIso(),
      updatedBy: actor.userId,
      ...(status === 'published' ? { publishedAt: nowIso(), publishedBy: actor.userId } : {}),
    };
    this.documents.set(documentId, updated);
    return updated;
  }

  restoreVersion(
    actor: KnowledgeAdminActor,
    documentId: string,
    version: number,
  ): AdminKnowledgeDocument {
    this.assertTenant(actor);
    const current = this.requireDocument(documentId);
    const snap = current.versions.find((v) => v.version === version);
    if (!snap) throw new Error('Version not found');
    return this.updateDocument(actor, documentId, {
      title: snap.title,
      body: snap.body,
      summary: snap.summary,
      changeNote: `Restored from v${version}`,
    });
  }

  requestApproval(
    actor: KnowledgeAdminActor,
    documentId: string,
    input?: { assignedTo?: string; note?: string },
  ): ApprovalRequest {
    this.assertTenant(actor);
    const doc = this.requireDocument(documentId);
    if (doc.status !== 'draft' && doc.status !== 'review') {
      throw new Error('Only draft/review documents can request approval');
    }
    this.transitionStatus(actor, documentId, 'review');
    const approval: ApprovalRequest = {
      id: randomUUID(),
      tenantId: this.tenantId,
      documentId,
      status: 'pending',
      step: 'reviewer',
      requestedBy: actor.userId,
      ...(input?.assignedTo ? { assignedTo: input.assignedTo } : {}),
      ...(input?.note ? { note: input.note } : {}),
      createdAt: nowIso(),
    };
    this.approvals.set(approval.id, approval);
    return approval;
  }

  decideApproval(
    actor: KnowledgeAdminActor,
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string,
  ): ApprovalRequest {
    this.assertTenant(actor);
    const approval = this.approvals.get(approvalId);
    if (!approval || approval.status !== 'pending') throw new Error('Approval not found');
    const decided: ApprovalRequest = {
      ...approval,
      status: decision,
      decidedAt: nowIso(),
      ...(note ? { note } : {}),
      step: decision === 'approved' ? 'publish' : 'author',
    };
    this.approvals.set(approvalId, decided);
    if (decision === 'approved') {
      this.transitionStatus(actor, approval.documentId, 'approved');
    } else {
      this.transitionStatus(actor, approval.documentId, 'draft');
    }
    return decided;
  }

  listApprovals(status?: ApprovalRequest['status']): readonly ApprovalRequest[] {
    let items = [...this.approvals.values()];
    if (status) items = items.filter((a) => a.status === status);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  playground(question: string, scope: 'draft' | 'published' = 'draft'): PlaygroundResult {
    const started = Date.now();
    const q = question.toLowerCase();
    const tokens = q.split(/\W+/).filter((t) => t.length > 2);
    const pool = this.listDocuments().filter((d) =>
      scope === 'draft'
        ? d.status === 'draft' || d.status === 'review' || d.status === 'approved'
        : d.status === 'published',
    );

    const scored = pool
      .map((doc) => {
        const hay = `${doc.title}\n${doc.summary}\n${doc.body}`.toLowerCase();
        let score = 0;
        for (const token of tokens) {
          if (doc.title.toLowerCase().includes(token)) score += 4;
          if (hay.includes(token)) score += 2;
        }
        return { doc, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 3);
    if (top.length === 0) {
      return {
        question,
        scope,
        answer: `No ${scope} knowledge matched “${question}”. I will not invent a policy answer.`,
        confidence: 0,
        latencyMs: Date.now() - started,
        citations: [],
        retrievedChunks: [],
        diagnostics: { query: question, candidateCount: pool.length, rankedCount: 0 },
      };
    }

    const best = top[0]!;
    const answer = [
      `Based on ${scope} content **${best.doc.title}** (v${best.doc.version}):`,
      '',
      best.doc.summary,
      '',
      best.doc.body.slice(0, 600),
      '',
      'This playground answer is for admin validation only and is not employee-facing until published.',
    ].join('\n');

    return {
      question,
      scope,
      answer,
      confidence: Math.min(0.95, best.score / 20),
      latencyMs: Date.now() - started,
      citations: top.map((t) => ({
        documentId: t.doc.id,
        title: t.doc.title,
        version: t.doc.version,
        status: t.doc.status,
      })),
      retrievedChunks: top.map((t) => ({
        documentId: t.doc.id,
        title: t.doc.title,
        excerpt: t.doc.body.slice(0, 220),
        score: t.score,
      })),
      diagnostics: {
        query: question,
        candidateCount: pool.length,
        rankedCount: scored.length,
      },
    };
  }

  analytics(): KnowledgeAnalyticsSnapshot {
    const docs = this.listDocuments();
    const byStatus = emptyStatusCounts();
    for (const d of docs) byStatus[d.status] += 1;
    const catCounts = new Map<string, number>();
    for (const d of docs) {
      for (const id of d.categoryIds) catCounts.set(id, (catCounts.get(id) ?? 0) + 1);
    }
    const topCategories = [...catCounts.entries()]
      .map(([id, count]) => ({
        id,
        name: this.categories.get(id)?.name ?? id,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      tenantId: this.tenantId,
      documentsTotal: docs.length,
      byStatus,
      categories: this.categories.size,
      tags: this.tags.size,
      collections: this.collections.size,
      folders: this.folders.size,
      pendingApprovals: this.listApprovals('pending').length,
      expiredDocs: byStatus.expired,
      publishedDocs: byStatus.published,
      draftDocs: byStatus.draft,
      avgTokenEstimate:
        docs.length === 0
          ? 0
          : Math.round(docs.reduce((s, d) => s + d.tokenEstimate, 0) / docs.length),
      topCategories,
      generatedAt: nowIso(),
    };
  }

  health(): KnowledgeHealthSnapshot {
    const docs = this.listDocuments();
    const fps = new Map<string, number>();
    for (const d of docs) fps.set(d.fingerprint, (fps.get(d.fingerprint) ?? 0) + 1);
    const duplicates = [...fps.values()].filter((n) => n > 1).length;

    return {
      tenantId: this.tenantId,
      indexed: docs.filter((d) => d.status === 'published').length,
      pending: docs.filter((d) => d.status === 'review' || d.status === 'approved').length,
      processing: 0,
      errors: 0,
      expired: docs.filter((d) => d.status === 'expired').length,
      missingOwner: docs.filter((d) => !d.ownerUserId).length,
      missingCategory: docs.filter((d) => d.categoryIds.length === 0).length,
      duplicates,
      generatedAt: nowIso(),
    };
  }

  findDuplicates(): readonly {
    fingerprint: string;
    documentIds: readonly string[];
    titles: readonly string[];
  }[] {
    const map = new Map<string, AdminKnowledgeDocument[]>();
    for (const d of this.listDocuments()) {
      const list = map.get(d.fingerprint) ?? [];
      list.push(d);
      map.set(d.fingerprint, list);
    }
    return [...map.entries()]
      .filter(([, docs]) => docs.length > 1)
      .map(([fingerprint, docs]) => ({
        fingerprint,
        documentIds: docs.map((d) => d.id),
        titles: docs.map((d) => d.title),
      }));
  }

  snapshot(): KnowledgeAdminStoreSnapshot {
    return {
      folders: this.listFolders(),
      documents: this.listDocuments(),
      categories: this.listCategories(),
      tags: this.listTags(),
      collections: this.listCollections(),
      approvals: this.listApprovals(),
      settings: this.settings,
    };
  }

  private assertTenant(actor: KnowledgeAdminActor): void {
    if (actor.tenantId !== this.tenantId) {
      throw new Error('Cross-tenant access denied');
    }
  }

  private requireFolder(folderId: string): KnowledgeFolder {
    const folder = this.folders.get(folderId);
    if (!folder || folder.tenantId !== this.tenantId) throw new Error('Folder not found');
    return folder;
  }

  private requireDocument(documentId: string): AdminKnowledgeDocument {
    const doc = this.documents.get(documentId);
    if (!doc || doc.tenantId !== this.tenantId) throw new Error('Document not found');
    return doc;
  }
}

const stores = new Map<string, InMemoryKnowledgeAdminStore>();

export function getKnowledgeAdminStore(tenantId: string): InMemoryKnowledgeAdminStore {
  let store = stores.get(tenantId);
  if (!store) {
    store = new InMemoryKnowledgeAdminStore(tenantId);
    stores.set(tenantId, store);
  }
  return store;
}
