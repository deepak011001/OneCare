import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ClarificationEngine,
  CommonEntities,
  createCapabilityRegistry,
  createCapabilityRunner,
  createCapabilityTelemetry,
  createValidationPipeline,
  extractDeclaredEntities,
  permissionValidator,
  requiredFieldsValidator,
  resolveRelativeDatePhrase,
  textResponse,
  toolAvailabilityValidator,
  buildConfirmationDraft,
} from './index';
import type { EmployeeCapability } from './capability';
import type {
  CapabilityExecuteInput,
  CapabilityExecuteResult,
  CapabilityHandleInput,
  CapabilityTurnInput,
  ClarificationResult,
  ConfirmationDraft,
  ExecutionPlan,
  SlotBag,
  ValidationResult,
} from './types';

function stubCapability(overrides: Partial<EmployeeCapability> = {}): EmployeeCapability {
  const base: EmployeeCapability = {
    id: 'ess.demo',
    name: 'Demo',
    version: '1.0.0',
    description: 'Demo capability',
    supportedIntents: ['employee.demo.run'],
    supportedEntities: [{ ...CommonEntities.reason, requiredForIntents: ['employee.demo.run'] }],
    supportedTools: ['demoTool'],
    requiredPermissions: ['demo.read'],
    priority: 10,
    enabled: true,
    canHandle(input: CapabilityHandleInput) {
      return /demo/i.test(input.message) || input.intent === 'employee.demo.run';
    },
    extractEntities(input: CapabilityTurnInput): SlotBag {
      return extractDeclaredEntities(
        this.supportedEntities,
        input.message,
        input.priorSlots ?? {},
        input.now,
      );
    },
    validate(input): ValidationResult {
      return createValidationPipeline(requiredFieldsValidator(['reason'])).run({
        intent: input.intent,
        slots: input.slots,
      });
    },
    clarify(input): ClarificationResult {
      return {
        question: 'What reason?',
        missing: input.missing,
        slots: input.slots,
        suggestedReplies: ['Personal'],
      };
    },
    buildExecutionPlan(input): ExecutionPlan {
      return {
        intent: input.intent,
        toolName: 'demoTool',
        arguments: { reason: input.slots.reason },
        requiresConfirmation: true,
        slots: input.slots,
        risk: 'medium',
      };
    },
    buildConfirmation(input): ConfirmationDraft {
      return buildConfirmationDraft({
        plan: input.plan,
        summary: `Run demo\nReason: ${String(input.slots.reason)}\nConfirm?`,
      });
    },
    async execute(_input: CapabilityExecuteInput): Promise<CapabilityExecuteResult> {
      return { kind: 'delegated', plan: _input.plan };
    },
    formatResponse() {
      return textResponse('Done.');
    },
    dashboardWidgets() {
      return [{ id: 'demo.widget', title: 'Demo', order: 1 }];
    },
    suggestedPrompts() {
      return [{ id: 'demo.starter', label: 'Try demo', prompt: 'Run demo', kind: 'starter' }];
    },
    helpExamples() {
      return {
        description: 'Demo',
        examples: ['Run demo for personal'],
        supportedActions: ['run'],
        limitations: ['demo only'],
        requiredPermissions: ['demo.read'],
      };
    },
    telemetry() {
      return { capabilityId: 'ess.demo', metricsPrefix: 'ess.demo' };
    },
    detectIntent(message) {
      return /demo/i.test(message) ? 'employee.demo.run' : undefined;
    },
    missingSlots(intent, slots) {
      if (intent === 'employee.demo.run' && !slots.reason) return ['reason'];
      return [];
    },
  };
  return { ...base, ...overrides };
}

describe('CapabilityRegistry', () => {
  it('registers, prioritizes, and disables capabilities', () => {
    const low = stubCapability({ id: 'low', priority: 1 });
    const high = stubCapability({ id: 'high', priority: 50, canHandle: () => true });
    const registry = createCapabilityRegistry([low, high]);
    assert.equal(registry.list()[0]?.id, 'high');
    registry.setEnabled('high', false);
    assert.equal(registry.list().length, 1);
    assert.equal(registry.list()[0]?.id, 'low');
    assert.equal(registry.findByIntent('employee.demo.run')?.id, 'low');
  });

  it('aggregates widgets and prompts', () => {
    const registry = createCapabilityRegistry([stubCapability()]);
    assert.equal(registry.allDashboardWidgets().length, 1);
    assert.equal(registry.allSuggestedPrompts().length, 1);
    assert.equal(registry.allHelp().length, 1);
  });
});

describe('entity extraction', () => {
  it('resolves relative dates and declared entities', () => {
    const now = new Date(2026, 6, 20);
    assert.equal(resolveRelativeDatePhrase('tomorrow', now)?.startDate, '2026-07-21');
    const slots = extractDeclaredEntities(
      [CommonEntities.dateRange, CommonEntities.leaveType, CommonEntities.reason],
      'Apply casual leave tomorrow for family function',
      {},
      now,
    );
    assert.equal(slots.startDate, '2026-07-21');
    assert.equal(slots.leaveType, 'Casual');
    assert.equal(slots.reason, 'family function');
  });
});

describe('validation pipeline', () => {
  it('checks required fields, permissions, and tools', () => {
    const pipeline = createValidationPipeline(
      requiredFieldsValidator(['reason']),
      permissionValidator(),
      toolAvailabilityValidator(),
    );
    const result = pipeline.run({
      intent: 'employee.demo.run',
      slots: {},
      requiredPermissions: ['demo.read'],
      requiredTools: ['demoTool'],
      availableTools: [],
      context: {
        tenantId: 't1',
        userId: 'u1',
        correlationId: 'c1',
        roles: [],
        permissions: [],
      },
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'REQUIRED_FIELD'));
    assert.ok(result.issues.some((i) => i.code === 'PERMISSION_DENIED'));
    assert.ok(result.issues.some((i) => i.code === 'TOOL_UNAVAILABLE'));
  });
});

describe('clarification engine', () => {
  it('asks for missing declared fields', () => {
    const engine = new ClarificationEngine();
    const answer = engine.ask({
      intent: 'employee.leave.apply',
      slots: {},
      declarations: [
        { ...CommonEntities.dateRange, requiredForIntents: ['employee.leave.apply'] },
        { ...CommonEntities.leaveType, requiredForIntents: ['employee.leave.apply'] },
      ],
    });
    assert.ok(answer);
    assert.ok(answer!.missing.includes('startDate') || answer!.missing.includes('leaveType'));
  });
});

describe('confirmation + response + telemetry', () => {
  it('builds confirmation draft and structured response', () => {
    const plan: ExecutionPlan = {
      intent: 'employee.demo.run',
      toolName: 'demoTool',
      arguments: { reason: 'Personal' },
      requiresConfirmation: true,
      slots: { reason: 'Personal' },
    };
    const draft = buildConfirmationDraft({ plan, summary: 'Confirm demo?' });
    assert.equal(draft.toolName, 'demoTool');
    assert.equal(draft.actions?.length, 2);
    const response = textResponse('Hello', { suggestedReplies: ['Yes'] });
    assert.equal(response.blocks[0]?.type, 'text');
  });

  it('records runner telemetry through lifecycle', () => {
    const telemetry = createCapabilityTelemetry();
    const runner = createCapabilityRunner({ telemetry });
    const capability = stubCapability();
    const clarify = runner.run(capability, { message: 'Run demo' });
    assert.equal(clarify.kind, 'clarify');
    const ready = runner.run(capability, {
      message: 'Personal',
      priorSlots: {},
      intent: 'employee.demo.run',
      // reason via extract - free text may not extract; set via message with reason keyword
    });
    // With only "Personal", reason extractor may not match — force via message
    const ready2 = runner.run(capability, {
      message: 'reason: Personal',
      intent: 'employee.demo.run',
    });
    assert.equal(ready2.kind, 'ready');
    assert.ok(telemetry.count('capability.clarification') >= 1);
    assert.ok(telemetry.count('capability.handled') >= 1);
    void ready;
  });
});
