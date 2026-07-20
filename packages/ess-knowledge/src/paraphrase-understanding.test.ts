import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createKnowledgeCapability, formatKnowledgeAssistantMessage } from './capability';
import { understandKnowledgeQuery } from './query-understanding';
import { createStubKnowledgeStore } from './retrieval';

/**
 * Employees ask the same HR question many ways — retrieval + answer must stay grounded.
 */
describe('knowledge paraphrase understanding (pre-HRMS)', () => {
  it('expands casual leave / WFH / resignation phrasing for retrieval', () => {
    const leave = understandKnowledgeQuery('please tell me about our PTO rules');
    assert.ok(leave.retrievalText.toLowerCase().includes('leave'));

    const wfh = understandKnowledgeQuery('Am I allowed to work remotely twice a week?');
    assert.ok(wfh.expandedTerms.some((t) => /wfh|hybrid|work from home/i.test(t)));

    const resign = understandKnowledgeQuery('What happens if I resign?');
    assert.ok(resign.expandedTerms.some((t) => /resign|exit|notice/i.test(t)));
  });

  it('answers many phrasings of leave policy with the same grounded source', async () => {
    const capability = createKnowledgeCapability({ retrieval: createStubKnowledgeStore() });
    const phrases = [
      'What is our leave policy?',
      'Tell me about vacation days',
      'Do we get PTO?',
      'How does paid time off work?',
      'please explain the leave rules',
    ];

    for (const message of phrases) {
      const outcome = await capability.process({
        message,
        permissions: ['knowledge.search'],
      });
      assert.equal(outcome.kind, 'answered', message);
      if (outcome.kind !== 'answered') continue;
      assert.ok(outcome.answer.sources.length > 0, message);
      assert.ok(
        outcome.answer.sources.some((s) => /leave/i.test(s.title)),
        `expected leave source for: ${message}`,
      );
      const text = formatKnowledgeAssistantMessage(outcome);
      assert.match(text, /knowledge base|Sources:/i);
      assert.doesNotMatch(text.toLowerCase(), /i guess|probably|as an ai/i);
    }
  });

  it('answers resignation phrasing from exit policy', async () => {
    const capability = createKnowledgeCapability({ retrieval: createStubKnowledgeStore() });
    const outcome = await capability.process({
      message: 'What happens if I resign?',
      permissions: ['knowledge.search'],
    });
    assert.equal(outcome.kind, 'answered');
    if (outcome.kind === 'answered') {
      assert.ok(outcome.answer.sources.some((s) => /resign|exit/i.test(s.title)));
      assert.match(formatKnowledgeAssistantMessage(outcome), /notice period|last working day/i);
    }
  });

  it('answers WFH paraphrases professionally', async () => {
    const capability = createKnowledgeCapability({ retrieval: createStubKnowledgeStore() });
    const outcome = await capability.process({
      message: 'can i work from home?',
      permissions: ['knowledge.search'],
    });
    assert.equal(outcome.kind, 'answered');
    if (outcome.kind === 'answered') {
      const text = formatKnowledgeAssistantMessage(outcome);
      assert.match(text, /Work From Home|hybrid|WFH/i);
      assert.match(text, /Here is what/i);
      assert.ok(outcome.answer.sources.length > 0);
    }
  });
});
