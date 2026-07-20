import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createCapabilityRegistry } from '@onecare/ess-capability';
import { createKnowledgeCapability, formatKnowledgeAssistantMessage } from './capability';
import {
  buildKnowledgeRequests,
  classifyKnowledgeText,
  detectKnowledgeIntent,
  isKnowledgeRelatedMessage,
  splitKnowledgeQuestions,
} from './intents';
import { extractKnowledgeEntities } from './entities';
import { createStubKnowledgeStore } from './retrieval';
import { buildKnowledgeAnswer } from './answer';

describe('ess-knowledge', () => {
  it('registers on the capability registry', () => {
    const capability = createKnowledgeCapability();
    const registry = createCapabilityRegistry([capability]);
    assert.equal(registry.get('ess.knowledge')?.id, 'ess.knowledge');
    assert.ok(registry.allDashboardWidgets().some((w) => w.id.startsWith('knowledge.')));
    assert.ok(registry.allSuggestedPrompts().length >= 3);
  });

  it('classifies hierarchical intents without hundreds of hardcoded intents', () => {
    const leave = classifyKnowledgeText('What is our leave policy?');
    assert.equal(leave.domain, 'hr');
    assert.equal(leave.category, 'leave');

    const wfh = classifyKnowledgeText('Can I work from home?');
    assert.equal(wfh.domain, 'hr');
    assert.equal(wfh.category, 'attendance');

    const finance = classifyKnowledgeText('I forgot how reimbursement works.');
    assert.equal(finance.domain, 'finance');
    assert.equal(finance.category, 'reimbursement');
  });

  it('supports multiple knowledge questions in one message', () => {
    const parts = splitKnowledgeQuestions(
      'What is the leave policy, who approves it, and where is it documented?',
    );
    assert.ok(parts.length >= 2);
    const requests = buildKnowledgeRequests(
      'What is the leave policy? Who approves it? Where is it documented?',
    );
    assert.ok(requests.length >= 2);
    assert.ok(requests.every((r) => r.intent === 'employee.knowledge.ask'));
  });

  it('extracts entities without failing on unknowns', () => {
    const slots = extractKnowledgeEntities(
      'What is the India maternity leave policy for remote employees?',
    );
    assert.equal(slots.country, 'India');
    assert.ok(slots.policyName || slots.leaveType === 'Maternity' || slots.keyword);
  });

  it('retrieves via abstraction with source attribution', async () => {
    const store = createStubKnowledgeStore();
    const capability = createKnowledgeCapability({ retrieval: store });
    const outcome = await capability.process({
      message: 'What is our leave policy?',
      permissions: ['knowledge.search'],
    });
    assert.equal(outcome.kind, 'answered');
    if (outcome.kind !== 'answered') return;
    assert.ok(outcome.answer.sources.length > 0);
    assert.ok(outcome.answer.sources[0]?.title);
    assert.ok(outcome.answer.confidence > 0);
    assert.match(formatKnowledgeAssistantMessage(outcome), /Source:/);
  });

  it('does not hallucinate sources when nothing matches', async () => {
    const store = createStubKnowledgeStore([]);
    const capability = createKnowledgeCapability({ retrieval: store });
    const outcome = await capability.process({
      message: 'What is the quantum teleportation stipend policy?',
      permissions: ['knowledge.search'],
    });
    assert.equal(outcome.kind, 'answered');
    if (outcome.kind !== 'answered') return;
    assert.equal(outcome.answer.sources.length, 0);
    assert.match(outcome.answer.text, /No documented source|could not find/i);
  });

  it('handles follow-up context', async () => {
    const capability = createKnowledgeCapability();
    const first = await capability.process({
      message: 'What is maternity leave?',
      permissions: ['knowledge.search'],
    });
    assert.equal(first.kind, 'answered');
    if (first.kind !== 'answered') return;

    const followUp = await capability.process({
      message: 'What about paternity?',
      priorSlots: first.slots,
      permissions: ['knowledge.search'],
    });
    assert.equal(followUp.kind, 'answered');
    if (followUp.kind !== 'answered') return;
    assert.match(followUp.answer.text.toLowerCase(), /paternity/);
  });

  it('suggests related documents', async () => {
    const capability = createKnowledgeCapability();
    const outcome = await capability.process({
      message: 'What is our leave policy?',
      permissions: ['knowledge.search'],
    });
    assert.equal(outcome.kind, 'answered');
    if (outcome.kind !== 'answered') return;
    assert.ok((outcome.answer.relatedDocuments?.length ?? 0) > 0);
  });

  it('clarifies only when required', async () => {
    const capability = createKnowledgeCapability();
    const vague = await capability.process({
      message: 'leave policy',
      permissions: ['knowledge.search'],
    });
    assert.equal(vague.kind, 'clarify');

    const clear = await capability.process({
      message: 'What is our leave policy in India?',
      permissions: ['knowledge.search'],
    });
    assert.equal(clear.kind, 'answered');
  });

  it('detects knowledge-related messages and intents', () => {
    assert.equal(isKnowledgeRelatedMessage('Where can I find the code of conduct?'), true);
    assert.equal(detectKnowledgeIntent('Show popular knowledge questions'), 'employee.knowledge.popular');
    assert.equal(detectKnowledgeIntent('What knowledge topics can you help with?'), 'employee.knowledge.help');
  });

  it('builds answer structure from retrieval hits', async () => {
    const store = createStubKnowledgeStore();
    const result = await store.search({ text: 'work from home', domain: 'hr' });
    const answer = buildKnowledgeAnswer({
      requests: buildKnowledgeRequests('Can I work from home?'),
      hitsByRequest: new Map([['req-1', result.hits]]),
    });
    assert.ok(answer.parts[0]?.found);
    assert.ok(answer.sources[0]?.documentId);
  });
});
