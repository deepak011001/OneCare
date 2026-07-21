import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KnowledgeAdminService, createKnowledgeAdminService } from './service';
import { InMemoryKnowledgeAdminStore } from './store';

describe('knowledge-admin', () => {
  it('seeds library taxonomy and supports folder nesting', () => {
    const store = new InMemoryKnowledgeAdminStore('t-folders');
    const svc = new KnowledgeAdminService(() => store);
    const actor = { tenantId: 't-folders', userId: 'admin-1' };
    const folders = svc.listFolders(actor);
    assert.ok(folders.some((f) => f.name === 'HR'));
    const hr = folders.find((f) => f.name === 'HR')!;
    const nested = svc.createFolder(actor, { name: 'Travel', parentId: hr.id });
    assert.match(nested.path, /HR\/Travel/);
  });

  it('creates draft documents with versions and publishes after approval', () => {
    const store = new InMemoryKnowledgeAdminStore('t-pub');
    const svc = new KnowledgeAdminService(() => store);
    const a = { tenantId: 't-pub', userId: 'u1' };

    const doc = svc.createDocument(a, {
      title: 'WFH Policy',
      body: 'Eligible employees may work from home up to 2 days per week.',
      summary: 'Hybrid work rules',
    });
    assert.equal(doc.status, 'draft');
    assert.equal(doc.version, 1);

    const updated = svc.updateDocument(a, doc.id, {
      body: `${doc.body}\nCore hours 11:00–16:00.`,
      changeNote: 'Add core hours',
    });
    assert.equal(updated.version, 2);

    const approval = svc.requestApproval(a, doc.id);
    assert.equal(approval.status, 'pending');
    svc.decideApproval(a, approval.id, 'approved');
    const published = svc.publish(a, doc.id);
    assert.equal(published.status, 'published');
  });

  it('playground answers only from draft scope and never invents', () => {
    const store = new InMemoryKnowledgeAdminStore('t-play');
    const svc = new KnowledgeAdminService(() => store);
    const a = { tenantId: 't-play', userId: 'u1' };
    svc.listFolders(a); // seed

    const hit = svc.playground(a, 'What is the leave policy?', 'draft');
    assert.ok(hit.citations.length > 0);
    assert.ok(hit.confidence > 0);

    const miss = svc.playground(a, 'quantum teleportation stipend?', 'draft');
    assert.equal(miss.citations.length, 0);
    assert.equal(miss.confidence, 0);
    assert.match(miss.answer, /will not invent/i);
  });

  it('blocks cross-tenant access against a bound store', () => {
    const store = new InMemoryKnowledgeAdminStore('acme');
    const svc = new KnowledgeAdminService(() => store);
    svc.listFolders({ tenantId: 'acme', userId: 'a' });
    assert.throws(() => {
      svc.createFolder({ tenantId: 'other', userId: 'x' }, { name: 'Hack' });
    }, /Cross-tenant/);
  });

  it('exposes analytics and health snapshots', () => {
    const service = createKnowledgeAdminService();
    const actor = { tenantId: `analytics-${Date.now()}`, userId: 'admin' };
    const dash = service.dashboard(actor);
    assert.ok(dash.analytics.documentsTotal >= 1);
    assert.equal(dash.analytics.tenantId, actor.tenantId);
  });
});
