import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveRelativeDatePhrase, toIsoDate } from './dates';
import { detectLeaveIntent, isLeaveRelatedMessage } from './intents';
import { extractLeaveEntities } from './entities';
import { createLeaveCapability } from './capability';
import { validateLeaveSlots } from './validation';

describe('date parsing', () => {
  it('resolves tomorrow relative to now', () => {
    const now = new Date(2026, 6, 20); // Jul 20 2026
    const resolved = resolveRelativeDatePhrase('apply leave tomorrow', now);
    assert.equal(resolved?.startDate, '2026-07-21');
    assert.equal(resolved?.endDate, '2026-07-21');
  });

  it('resolves next Friday', () => {
    const now = new Date(2026, 6, 20); // Monday
    const resolved = resolveRelativeDatePhrase('casual leave next Friday', now);
    assert.equal(resolved?.startDate, '2026-07-24');
  });
});

describe('intent detection', () => {
  it('detects balance and apply intents', () => {
    assert.equal(detectLeaveIntent('What is my leave balance?')?.intent, 'employee.leave.balance');
    assert.equal(detectLeaveIntent('How many leaves do I have?')?.intent, 'employee.leave.balance');
    assert.equal(detectLeaveIntent('Apply casual leave tomorrow')?.toolName, 'applyLeave');
    assert.equal(detectLeaveIntent('Which leave types are available?')?.toolName, 'leaveTypes');
    assert.equal(detectLeaveIntent('Cancel my leave')?.intent, 'employee.leave.cancel');
  });

  it('does not claim leave policy questions (knowledge owns them)', () => {
    assert.equal(detectLeaveIntent('What is the leave policy?'), null);
    assert.equal(isLeaveRelatedMessage('What is the leave policy?'), false);
    assert.equal(isLeaveRelatedMessage('Explain our leave handbook'), false);
    assert.equal(isLeaveRelatedMessage('How many leaves do I have?'), true);
  });
});

describe('entity extraction', () => {
  it('extracts type and relative date', () => {
    const now = new Date(2026, 6, 20);
    const slots = extractLeaveEntities('Apply casual leave tomorrow for family function', {}, now);
    assert.equal(slots.leaveType, 'Casual');
    assert.equal(slots.startDate, '2026-07-21');
    assert.equal(slots.reason, 'family function');
  });
});

describe('validation', () => {
  it('flags insufficient balance', () => {
    const issues = validateLeaveSlots({
      intent: 'employee.leave.apply',
      slots: {
        startDate: '2026-08-10',
        endDate: '2026-08-12',
        leaveType: 'Casual',
        reason: 'Trip',
      },
      now: new Date(2026, 6, 20),
      balances: [{ leaveType: 'Casual', available: 1 }],
    });
    assert.ok(issues.some((i) => i.code === 'INSUFFICIENT_BALANCE'));
  });
});

describe('LeaveCapability', () => {
  it('clarifies missing leave type for apply', () => {
    const capability = createLeaveCapability();
    const outcome = capability.process({
      message: 'Apply leave tomorrow',
      now: new Date(2026, 6, 20),
    });
    assert.equal(outcome.kind, 'clarify');
    if (outcome.kind === 'clarify') {
      assert.ok(outcome.missing.includes('leaveType') || outcome.missing.includes('reason'));
    }
  });

  it('returns ready apply after slots complete', () => {
    const capability = createLeaveCapability();
    const outcome = capability.process({
      message: 'Family function',
      priorSlots: {
        startDate: '2026-08-10',
        endDate: '2026-08-10',
        leaveType: 'Casual',
      },
      now: new Date(2026, 6, 20),
      balances: [{ leaveType: 'Casual', available: 5 }],
      leaveTypes: ['Casual', 'Sick', 'Annual'],
    });
    assert.equal(outcome.kind, 'ready');
    if (outcome.kind === 'ready') {
      assert.equal(outcome.toolName, 'applyLeave');
      assert.equal(outcome.requiresConfirmation, true);
      assert.equal(outcome.arguments.leaveType, 'Casual');
    }
  });

  it('formats iso helper', () => {
    assert.equal(toIsoDate(new Date(2026, 0, 5)), '2026-01-05');
  });
});
