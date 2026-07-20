import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createCapabilityRegistry, createCapabilityRunner } from '@onecare/ess-capability';
import { createAttendanceCapability } from './capability';
import { detectAttendanceIntent } from './intents';
import { extractAttendanceEntities } from './entities';
import { validateAttendanceSlots } from './validation';

describe('attendance intents', () => {
  it('detects clock in/out and today', () => {
    assert.equal(detectAttendanceIntent('Clock me in')?.toolName, 'clockIn');
    assert.equal(detectAttendanceIntent('Clock me out')?.toolName, 'clockOut');
    assert.equal(detectAttendanceIntent('Am I checked in today?')?.toolName, 'attendanceToday');
  });
});

describe('attendance entities', () => {
  it('extracts yesterday for regularization', () => {
    const now = new Date(2026, 6, 20);
    const slots = extractAttendanceEntities('Regularize yesterday for forgot punch', {}, now);
    assert.equal(slots.date, '2026-07-19');
    assert.ok(slots.reason);
  });
});

describe('attendance validation', () => {
  it('blocks double clock-in', () => {
    const issues = validateAttendanceSlots({
      intent: 'employee.attendance.clock_in',
      slots: {},
      today: {
        date: '2026-07-20',
        status: 'checked_in',
        checkInAt: '09:05',
      },
    });
    assert.ok(issues.some((i) => i.code === 'ALREADY_CHECKED_IN'));
  });
});

describe('AttendanceCapability', () => {
  it('clarifies regularization date/reason', () => {
    const capability = createAttendanceCapability();
    const outcome = capability.process({ message: 'Regularize my attendance' });
    assert.equal(outcome.kind, 'clarify');
  });

  it('returns ready clock-in', () => {
    const capability = createAttendanceCapability();
    const outcome = capability.process({
      message: 'Clock me in',
      today: { date: '2026-07-20', status: 'not_started' },
    });
    assert.equal(outcome.kind, 'ready');
    if (outcome.kind === 'ready') {
      assert.equal(outcome.toolName, 'clockIn');
      assert.equal(outcome.requiresConfirmation, false);
    }
  });

  it('requires confirmation for clock-out', () => {
    const capability = createAttendanceCapability();
    const outcome = capability.process({
      message: 'Clock me out',
      today: { date: '2026-07-20', status: 'checked_in', checkInAt: '09:00' },
    });
    assert.equal(outcome.kind, 'ready');
    if (outcome.kind === 'ready') {
      assert.equal(outcome.requiresConfirmation, true);
      assert.ok(outcome.confirmationSummary);
    }
  });

  it('registers on the capability registry', () => {
    const registry = createCapabilityRegistry([createAttendanceCapability()]);
    assert.ok(registry.get('ess.attendance'));
    assert.ok(registry.allDashboardWidgets().some((w) => w.id.startsWith('attendance.')));
    assert.ok(registry.allSuggestedPrompts().length >= 3);
  });

  it('runs through CapabilityRunner for today status', () => {
    const runner = createCapabilityRunner();
    const outcome = runner.run(createAttendanceCapability(), {
      message: "Show today's attendance",
      now: new Date(2026, 6, 20),
    });
    assert.equal(outcome.kind, 'ready');
  });
});
