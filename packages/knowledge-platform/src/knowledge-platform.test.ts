import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createEnterpriseKnowledgePlatform } from './platform';
import { isAclAllowed } from './acl';
import { ConfigurableChunker } from './chunking';
import { DefaultNormalizer } from './normalization';
import { HeuristicMetadataExtractor } from './metadata';
import type { DocumentAcl, KnowledgeSourceConfig, NormalizedDocument } from './types';

describe('ACL', () => {
  it('blocks cross-tenant access', () => {
    const acl: DocumentAcl = { tenantId: 't1', visibility: 'public' };
    assert.equal(isAclAllowed(acl, { tenantId: 't2' }), false);
    assert.equal(isAclAllowed(acl, { tenantId: 't1' }), true);
  });

  it('enforces private owner lists', () => {
    const acl: DocumentAcl = {
      tenantId: 't1',
      visibility: 'private',
      ownerUserIds: ['u1'],
    };
    assert.equal(isAclAllowed(acl, { tenantId: 't1', userId: 'u2' }), false);
    assert.equal(isAclAllowed(acl, { tenantId: 't1', userId: 'u1' }), true);
  });

  it('enforces restricted roles', () => {
    const acl: DocumentAcl = {
      tenantId: 't1',
      visibility: 'restricted',
      roles: ['hr_admin'],
    };
    assert.equal(isAclAllowed(acl, { tenantId: 't1', roles: ['employee'] }), false);
    assert.equal(isAclAllowed(acl, { tenantId: 't1', roles: ['hr_admin'] }), true);
  });
});

describe('normalization + chunking + metadata', () => {
  it('normalizes and chunks a document', () => {
    const source: KnowledgeSourceConfig = {
      id: 's1',
      tenantId: 't1',
      name: 'Local',
      connectorType: 'markdown',
      enabled: true,
    };
    const normalizer = new DefaultNormalizer();
    const doc = normalizer.normalize({
      tenantId: 't1',
      source,
      document: {
        externalId: 'd1',
        title: 'Travel Policy',
        body: '# Overview\nFly economy.\n\n# Approvals\nManager approval required.',
        lastModified: '2026-01-01',
      },
      acl: { tenantId: 't1', visibility: 'public' },
      version: 1,
    });
    assert.equal(doc.title, 'Travel Policy');
    assert.ok(doc.fingerprint.length > 10);
    assert.ok(doc.sections.length >= 1);

    const meta = new HeuristicMetadataExtractor().extract(doc);
    assert.equal(meta.domain, 'hr');
    const chunks = new ConfigurableChunker({ strategy: 'heading' }).chunk(doc, meta);
    assert.ok(chunks.length >= 1);
    assert.ok(chunks[0]!.id.includes('chunk'));
  });
});

describe('enterprise knowledge platform', () => {
  it('indexes seed corpus and retrieves with citations via KnowledgeRetrievalPort', async () => {
    const platform = await createEnterpriseKnowledgePlatform({
      tenantId: 'acme',
      seedStubCorpus: true,
    });

    const result = await platform.retrieval.search({
      tenantId: 'acme',
      text: 'What is our leave policy?',
      limit: 3,
    });

    assert.equal(result.engine, 'enterprise-knowledge-platform');
    assert.ok(result.hits.length > 0);
    assert.ok(result.hits[0]!.document.title.toLowerCase().includes('leave'));

    const stats = await platform.index.stats('acme');
    assert.ok(stats.documents > 0);
    assert.ok(stats.chunks > 0);

    const snap = platform.metrics.snapshot();
    assert.ok(snap.documentsIndexed > 0);
    assert.ok(snap.hits >= 1);
  });

  it('does not leak documents across tenants', async () => {
    const a = await createEnterpriseKnowledgePlatform({
      tenantId: 'tenant-a',
      seedStubCorpus: true,
    });
    const b = await createEnterpriseKnowledgePlatform({
      tenantId: 'tenant-b',
      seedStubCorpus: false,
    });

    const fromB = await b.retrieval.search({
      tenantId: 'tenant-b',
      text: 'leave policy',
      limit: 5,
    });
    assert.equal(fromB.hits.length, 0);

    const fromA = await a.retrieval.search({
      tenantId: 'tenant-a',
      text: 'leave policy',
      limit: 5,
    });
    assert.ok(fromA.hits.length > 0);
  });

  it('supports incremental sync and soft delete', async () => {
    const platform = await createEnterpriseKnowledgePlatform({
      tenantId: 'sync-t',
      seedStubCorpus: false,
    });

    const source: KnowledgeSourceConfig = {
      id: 'local-1',
      tenantId: 'sync-t',
      name: 'Docs',
      connectorType: 'local_files',
      enabled: true,
      options: {
        documents: [
          {
            externalId: 'p1',
            title: 'WFH Policy',
            body: 'Work from home is allowed two days per week.',
            lastModified: '2026-02-01',
          },
        ],
      },
    };
    await platform.sources.upsert(source);
    const job1 = await platform.ingestion.sync({
      tenantId: 'sync-t',
      source,
      mode: 'full',
    });
    assert.equal(job1.status, 'succeeded');
    assert.equal(job1.documentsProcessed, 1);

    const job2 = await platform.ingestion.sync({
      tenantId: 'sync-t',
      source,
      mode: 'incremental',
    });
    assert.equal(job2.documentsProcessed, 0);

    const deletedSource: KnowledgeSourceConfig = {
      ...source,
      options: {
        documents: [
          {
            externalId: 'p1',
            title: 'WFH Policy',
            body: 'Work from home is allowed two days per week.',
            lastModified: '2026-02-01',
            deleted: true,
          },
        ],
      },
    };
    await platform.sources.upsert(deletedSource);
    const job3 = await platform.ingestion.sync({
      tenantId: 'sync-t',
      source: deletedSource,
      mode: 'incremental',
    });
    assert.ok(job3.documentsProcessed >= 1);
    const found = await platform.retrieval.search({
      tenantId: 'sync-t',
      text: 'work from home',
      limit: 5,
    });
    assert.equal(found.hits.length, 0);
  });

  it('lists connector stubs', async () => {
    const platform = await createEnterpriseKnowledgePlatform({
      tenantId: 'c',
      seedStubCorpus: false,
    });
    const types = platform.connectors.list().map((c) => c.type);
    assert.ok(types.includes('sharepoint'));
    assert.ok(types.includes('confluence'));
    assert.ok(types.includes('pdf'));
  });
});

describe('citation model', () => {
  it('never invents citations when nothing matches', async () => {
    const platform = await createEnterpriseKnowledgePlatform({
      tenantId: 'empty',
      seedStubCorpus: false,
    });
    const result = await platform.hybridSearch.search({
      tenantId: 'empty',
      text: 'quantum payroll teleportation',
      principal: { tenantId: 'empty' },
      limit: 5,
    });
    assert.equal(result.hits.length, 0);
    assert.equal(result.diagnostics.afterRerank, 0);
  });
});

describe('M6.6 ESS knowledge scenarios', () => {
  it('grounds leave policy and WFH questions with citations', async () => {
    const platform = await createEnterpriseKnowledgePlatform({
      tenantId: 'acme',
      seedStubCorpus: true,
    });
    for (const q of [
      'What is our leave policy?',
      'Explain the work from home policy.',
      'What happens if I resign?',
    ]) {
      const result = await platform.retrieval.search({
        tenantId: 'acme',
        text: q,
        limit: 3,
      });
      // Unknown/resign may miss — leave/WFH must hit
      if (q.toLowerCase().includes('leave') || q.toLowerCase().includes('home')) {
        assert.ok(result.hits.length > 0, `expected hits for: ${q}`);
        assert.ok(result.hits[0]!.document.id);
        assert.ok(result.hits[0]!.document.title);
      }
    }
  });

  it('enforces ACL on restricted documents during hybrid search', async () => {
    const platform = await createEnterpriseKnowledgePlatform({
      tenantId: 'acl-t',
      seedStubCorpus: false,
    });
    const source = {
      id: 'hr-private',
      tenantId: 'acl-t',
      name: 'Restricted',
      connectorType: 'markdown' as const,
      enabled: true,
      options: {
        visibility: 'restricted',
        roles: ['hr_admin'],
        documents: [
          {
            externalId: 'secret-comp',
            title: 'Executive Comp Policy',
            body: 'Confidential compensation bands.',
            lastModified: '2026-01-01',
          },
        ],
      },
    };
    await platform.sources.upsert(source);
    await platform.ingestion.sync({ tenantId: 'acl-t', source, mode: 'full' });

    const denied = await platform.hybridSearch.search({
      tenantId: 'acl-t',
      text: 'compensation bands',
      principal: { tenantId: 'acl-t', roles: ['employee'] },
      limit: 5,
    });
    assert.equal(denied.hits.length, 0);

    const allowed = await platform.hybridSearch.search({
      tenantId: 'acl-t',
      text: 'compensation bands',
      principal: { tenantId: 'acl-t', roles: ['hr_admin'] },
      limit: 5,
    });
    assert.ok(allowed.hits.length > 0);
  });
});

describe('normalizer fingerprint stability', () => {
  it('changes fingerprint when body changes', () => {
    const source: KnowledgeSourceConfig = {
      id: 's',
      tenantId: 't',
      name: 'n',
      connectorType: 'markdown',
      enabled: true,
    };
    const n = new DefaultNormalizer();
    const a = n.normalize({
      tenantId: 't',
      source,
      document: {
        externalId: '1',
        title: 'A',
        body: 'one',
        lastModified: '2026-01-01',
      },
      acl: { tenantId: 't', visibility: 'public' },
      version: 1,
    });
    const b = n.normalize({
      tenantId: 't',
      source,
      document: {
        externalId: '1',
        title: 'A',
        body: 'two',
        lastModified: '2026-01-01',
      },
      acl: { tenantId: 't', visibility: 'public' },
      version: 1,
    });
    assert.notEqual(a.fingerprint, b.fingerprint);
    const _typed: NormalizedDocument = a;
    assert.ok(_typed.id.includes('t:s:1'));
  });
});
