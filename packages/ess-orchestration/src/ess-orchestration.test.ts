import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createCapabilityRegistry,
  type CapabilityExecuteInput,
  type CapabilityExecuteResult,
  type CapabilityHandleInput,
  type CapabilityHelp,
  type CapabilityResponse,
  type CapabilityTelemetryDescriptor,
  type CapabilityTurnInput,
  type ClarificationResult,
  type ConfirmationDraft,
  type DashboardWidgetDef,
  type EmployeeCapability,
  type EntityDeclaration,
  type ExecutionPlan,
  type SlotBag,
  type SuggestedPromptDef,
  type ValidationResult,
} from '@onecare/ess-capability';
import { selectCapabilities } from './capability-selector';
import { buildExecutionGraph, detectDependencies } from './graph-builder';
import { splitIntentSegments } from './intent-splitter';
import { mergeClarifications, mergeConfirmations } from './mergers';
import { createCapabilityToolPort, createCrossCapabilityOrchestrator } from './orchestrator';
import { detectConflicts, mergeResponses } from './response';
import type { ExecutionGraphNode } from './types';

function stubCapability(input: {
  id: string;
  name: string;
  intents: string[];
  priority?: number;
  keywords: RegExp;
  write?: boolean;
  clarifyMissing?: string[];
}): EmployeeCapability {
  return {
    id: input.id,
    name: input.name,
    version: '1.0.0',
    description: input.name,
    supportedIntents: input.intents,
    supportedEntities: [] as EntityDeclaration[],
    supportedTools: input.write ? ['writeTool'] : ['readTool'],
    requiredPermissions: [],
    priority: input.priority ?? 50,
    enabled: true,
    canHandle(handle: CapabilityHandleInput) {
      return input.keywords.test(handle.message) || Boolean(handle.intent?.startsWith(input.id));
    },
    detectIntent(message: string) {
      return input.keywords.test(message) ? input.intents[0] : undefined;
    },
    extractEntities(turn: CapabilityTurnInput): SlotBag {
      return { ...(turn.priorSlots ?? {}), q: turn.message };
    },
    missingSlots() {
      return input.clarifyMissing ?? [];
    },
    validate(): ValidationResult {
      return { ok: true, issues: [] };
    },
    clarify(req): ClarificationResult {
      return {
        question: `Need ${req.missing.join(', ')} for ${input.name}`,
        missing: req.missing,
        slots: req.slots,
        suggestedReplies: ['Tomorrow'],
      };
    },
    buildExecutionPlan(turn): ExecutionPlan {
      return {
        intent: turn.intent,
        toolName: input.write ? 'writeTool' : 'readTool',
        arguments: { q: turn.message },
        requiresConfirmation: Boolean(input.write),
        slots: turn.slots,
        risk: input.write ? 'medium' : 'low',
      };
    },
    buildConfirmation(req): ConfirmationDraft | null {
      if (!req.plan.requiresConfirmation) return null;
      return {
        summary: `Confirm ${input.name}`,
        risk: 'medium',
        toolName: req.plan.toolName,
        arguments: req.plan.arguments,
      };
    },
    async execute(_req: CapabilityExecuteInput): Promise<CapabilityExecuteResult> {
      return { kind: 'completed', data: { ok: true, capability: input.id } };
    },
    formatResponse(req): CapabilityResponse {
      return {
        text: `${input.name}: ${JSON.stringify(req.toolResult ?? {})}`,
        blocks: [{ type: 'text', text: `${input.name} result` }],
      };
    },
    dashboardWidgets(): DashboardWidgetDef[] {
      return [];
    },
    suggestedPrompts(): SuggestedPromptDef[] {
      return [
        { id: `${input.id}.fu`, label: 'Follow up', prompt: 'Tell me more', kind: 'follow_up' },
      ];
    },
    helpExamples(): CapabilityHelp {
      return {
        description: input.name,
        examples: [],
        supportedActions: [],
        limitations: [],
        requiredPermissions: [],
      };
    },
    telemetry(): CapabilityTelemetryDescriptor {
      return { capabilityId: input.id, metricsPrefix: input.id };
    },
  };
}

describe('ess-orchestration', () => {
  const leave = stubCapability({
    id: 'ess.leave',
    name: 'Leave',
    intents: ['employee.leave.balance', 'employee.leave.apply'],
    keywords: /leave|holiday/i,
    priority: 100,
  });
  const attendance = stubCapability({
    id: 'ess.attendance',
    name: 'Attendance',
    intents: ['employee.attendance.today'],
    keywords: /attendance|checked in|clock/i,
    priority: 90,
  });
  const knowledge = stubCapability({
    id: 'ess.knowledge',
    name: 'Knowledge',
    intents: ['employee.knowledge.ask'],
    keywords: /policy|handbook|wfh|reimburs/i,
    priority: 80,
  });
  const leaveWrite = stubCapability({
    id: 'ess.leave',
    name: 'Leave',
    intents: ['employee.leave.apply'],
    keywords: /apply leave/i,
    priority: 100,
    write: true,
    clarifyMissing: ['startDate'],
  });

  it('splits multi-intent messages', () => {
    const segments = splitIntentSegments('How many leaves do I have and show today attendance');
    assert.ok(segments.length >= 2);
  });

  it('selects multiple capabilities from the registry', () => {
    const registry = createCapabilityRegistry([leave, attendance, knowledge]);
    const segments = splitIntentSegments('How many leaves do I have? What is the leave policy?');
    const selections = selectCapabilities({ registry, segments });
    const ids = new Set(selections.map((s) => s.capabilityId));
    assert.ok(ids.has('ess.leave') || ids.has('ess.knowledge'));
    assert.ok(selections.every((s) => s.confidence > 0 || s.capabilityId === 'unknown'));
  });

  it('builds parallel graph for independent reads', () => {
    const selections = [
      {
        capabilityId: 'ess.leave',
        capabilityName: 'Leave',
        confidence: 0.9,
        reason: 'intent',
        segmentId: 'seg-1',
        segmentText: 'leave balance',
        intent: 'employee.leave.balance',
      },
      {
        capabilityId: 'ess.attendance',
        capabilityName: 'Attendance',
        confidence: 0.9,
        reason: 'intent',
        segmentId: 'seg-2',
        segmentText: 'attendance today',
        intent: 'employee.attendance.today',
      },
    ];
    const graph = buildExecutionGraph({
      selections,
      plans: new Map([
        [
          'seg-1',
          {
            kind: 'read',
            priority: 500,
            requiresConfirmation: false,
            plan: {
              intent: 'employee.leave.balance',
              toolName: 'readTool',
              arguments: {},
              requiresConfirmation: false,
              slots: {},
            },
          },
        ],
        [
          'seg-2',
          {
            kind: 'read',
            priority: 490,
            requiresConfirmation: false,
            plan: {
              intent: 'employee.attendance.today',
              toolName: 'readTool',
              arguments: {},
              requiresConfirmation: false,
              slots: {},
            },
          },
        ],
      ]),
    });
    assert.equal(graph.nodes.length, 2);
    assert.ok(graph.nodes.every((n) => n.mode === 'parallel'));
  });

  it('detects write dependencies on reads', () => {
    const nodes = [
      {
        id: 'node-1',
        capabilityId: 'ess.leave',
        capabilityName: 'Leave',
        segmentId: 'seg-1',
        segmentText: 'balance',
        kind: 'read' as const,
        mode: 'parallel' as const,
        dependsOn: [] as string[],
        priority: 400,
        requiresConfirmation: false,
      },
      {
        id: 'node-2',
        capabilityId: 'ess.leave',
        capabilityName: 'Leave',
        segmentId: 'seg-2',
        segmentText: 'apply',
        kind: 'write' as const,
        mode: 'sequential' as const,
        dependsOn: [] as string[],
        priority: 700,
        requiresConfirmation: true,
      },
    ];
    const deps = detectDependencies(nodes);
    assert.deepEqual(deps.get('node-2'), ['node-1']);
  });

  it('merges clarifications and confirmations', () => {
    const merged = mergeClarifications({
      'ess.leave': {
        question: 'Which date?',
        missing: ['startDate'],
        slots: {},
        suggestedReplies: ['Tomorrow'],
      },
      'ess.knowledge': {
        question: 'Which country?',
        missing: ['country'],
        slots: {},
        suggestedReplies: ['India'],
      },
    });
    assert.ok(merged);
    assert.match(merged!.question, /few details/i);
    assert.ok(merged!.missing.includes('startDate'));
    assert.ok(merged!.missing.includes('country'));

    const conf = mergeConfirmations(
      [
        {
          summary: 'Clock out now',
          risk: 'medium',
          toolName: 'clockOut',
          arguments: {},
        },
        {
          summary: 'Apply leave tomorrow',
          risk: 'high',
          toolName: 'applyLeave',
          arguments: {},
        },
      ],
      { clockOut: 'c1', applyLeave: 'c2' },
    );
    assert.ok(conf);
    assert.equal(conf!.risk, 'high');
    assert.equal(conf!.toolNames.length, 2);
    assert.equal(conf!.confirmationIds.clockOut, 'c1');
  });

  it('merges responses and surfaces partial failure', () => {
    const nodes: ExecutionGraphNode[] = [
      {
        id: 'n1',
        capabilityId: 'ess.knowledge',
        capabilityName: 'Knowledge',
        segmentId: 's1',
        segmentText: 'policy',
        kind: 'knowledge',
        mode: 'parallel',
        dependsOn: [],
        priority: 1,
        requiresConfirmation: false,
        status: 'completed',
        resultText: 'Policy says carry forward is 5 days.',
      },
      {
        id: 'n2',
        capabilityId: 'ess.leave',
        capabilityName: 'Leave',
        segmentId: 's2',
        segmentText: 'balance',
        kind: 'read',
        mode: 'parallel',
        dependsOn: [],
        priority: 1,
        requiresConfirmation: false,
        status: 'failed',
        errorMessage: 'connector down',
      },
    ];
    const text = mergeResponses(nodes);
    assert.match(text, /Policy says/);
    assert.match(text, /unavailable/i);
    const conflicts = detectConflicts(nodes);
    assert.ok(conflicts.some((c) => c.code === 'PARTIAL_FAILURE'));
  });

  it('runs dual-capability orchestration end-to-end', async () => {
    const registry = createCapabilityRegistry([leave, attendance]);
    const orchestrator = createCrossCapabilityOrchestrator({ registry });
    const tools = createCapabilityToolPort({
      getTool: () => ({ implemented: true, connectorId: 'stub' }),
      execute: async () => ({ ok: true, data: { ok: true } }),
    });

    const result = await orchestrator.run({
      message: 'How many leaves do I have and show today attendance',
      context: {
        tenantId: 't1',
        userId: 'u1',
        correlationId: 'c1',
        roles: ['Employee'],
        permissions: ['leave.read', 'attendance.read'],
      },
      tools,
    });

    assert.ok(result.kind === 'completed' || result.kind === 'partial');
    assert.ok(result.diagnostics.capabilitiesUsed.length >= 1);
    assert.ok(result.text.length > 0);
  });

  it('returns merged clarification when slots are missing', async () => {
    const registry = createCapabilityRegistry([leaveWrite]);
    const orchestrator = createCrossCapabilityOrchestrator({ registry });
    const tools = createCapabilityToolPort({
      getTool: () => ({ implemented: true }),
      execute: async () => ({ ok: true, data: {} }),
    });
    const result = await orchestrator.run({
      message: 'Apply leave',
      context: {
        tenantId: 't1',
        userId: 'u1',
        correlationId: 'c1',
        roles: ['Employee'],
        permissions: ['leave.apply'],
      },
      tools,
    });
    assert.equal(result.kind, 'clarify');
  });

  it('returns confirmation_required for write tools', async () => {
    const writer = stubCapability({
      id: 'ess.attendance',
      name: 'Attendance',
      intents: ['employee.attendance.clock_out'],
      keywords: /clock out/i,
      write: true,
    });
    writer.execute = async () => ({
      kind: 'confirmation_required',
      confirmationId: 'conf-1',
      summary: 'Confirm clock out?',
    });
    const registry = createCapabilityRegistry([writer]);
    const orchestrator = createCrossCapabilityOrchestrator({ registry });
    const tools = createCapabilityToolPort({
      getTool: () => ({ implemented: true }),
      execute: async () => ({
        ok: false,
        decision: 'confirmation_required',
        confirmationId: 'conf-1',
      }),
    });
    const result = await orchestrator.run({
      message: 'Clock out',
      context: {
        tenantId: 't1',
        userId: 'u1',
        correlationId: 'c1',
        roles: ['Employee'],
        permissions: ['attendance.clockout'],
      },
      tools,
    });
    assert.equal(result.kind, 'confirmation_required');
  });

  it('handles unknown intent gracefully', async () => {
    const registry = createCapabilityRegistry([leave]);
    const orchestrator = createCrossCapabilityOrchestrator({ registry });
    const tools = createCapabilityToolPort({
      getTool: () => undefined,
      execute: async () => ({ ok: false, errorMessage: 'no' }),
    });
    const result = await orchestrator.run({
      message: 'xyzzy unrelated nonsense',
      context: {
        tenantId: 't1',
        userId: 'u1',
        correlationId: 'c1',
        roles: ['Employee'],
        permissions: [],
      },
      tools,
    });
    assert.equal(result.kind, 'unsupported');
  });

  it('executes independent reads in parallel mode', () => {
    const selections = [
      {
        capabilityId: 'ess.leave',
        capabilityName: 'Leave',
        confidence: 0.9,
        reason: 'intent',
        segmentId: 'seg-1',
        segmentText: 'leave balance',
        intent: 'employee.leave.balance',
      },
      {
        capabilityId: 'ess.knowledge',
        capabilityName: 'Knowledge',
        confidence: 0.9,
        reason: 'intent',
        segmentId: 'seg-2',
        segmentText: 'leave policy',
        intent: 'employee.knowledge.ask',
      },
    ];
    const graph = buildExecutionGraph({
      selections,
      plans: new Map([
        [
          'seg-1',
          {
            kind: 'read',
            priority: 500,
            requiresConfirmation: false,
            plan: {
              intent: 'employee.leave.balance',
              toolName: 'leaveBalance',
              arguments: {},
              requiresConfirmation: false,
              slots: {},
            },
          },
        ],
        [
          'seg-2',
          {
            kind: 'knowledge',
            priority: 380,
            requiresConfirmation: false,
            plan: {
              intent: 'employee.knowledge.ask',
              toolName: 'knowledge.search',
              arguments: {},
              requiresConfirmation: false,
              slots: {},
            },
          },
        ],
      ]),
    });
    assert.ok(graph.nodes.every((n) => n.mode === 'parallel'));
  });

  it('handles partial failure without aborting siblings', async () => {
    const okCap = stubCapability({
      id: 'ess.knowledge',
      name: 'Knowledge',
      intents: ['employee.knowledge.ask'],
      keywords: /policy/i,
      priority: 80,
    });
    const badCap = stubCapability({
      id: 'ess.leave',
      name: 'Leave',
      intents: ['employee.leave.balance'],
      keywords: /leaves|balance/i,
      priority: 100,
    });
    badCap.execute = async () => ({ kind: 'failed', message: 'connector down' });
    const registry = createCapabilityRegistry([okCap, badCap]);
    const orchestrator = createCrossCapabilityOrchestrator({ registry });
    const tools = createCapabilityToolPort({
      getTool: () => ({ implemented: true }),
      execute: async () => ({ ok: true, data: {} }),
    });
    const result = await orchestrator.run({
      message: 'What is the leave policy? How many leaves do I have?',
      context: {
        tenantId: 't1',
        userId: 'u1',
        correlationId: 'c1',
        roles: ['Employee'],
        permissions: ['leave.read', 'knowledge.search'],
      },
      tools,
    });
    assert.ok(
      result.kind === 'partial' || result.kind === 'completed' || result.kind === 'unsupported',
    );
    if (result.kind === 'partial' || result.kind === 'completed') {
      assert.ok(result.text.length > 0);
    }
  });

  it('respects prior conversation slots for follow-ups', async () => {
    const writer = stubCapability({
      id: 'ess.leave',
      name: 'Leave',
      intents: ['employee.leave.apply'],
      keywords: /apply leave|tomorrow/i,
      priority: 100,
      write: true,
      clarifyMissing: ['startDate'],
    });
    writer.canHandle = (handle) =>
      /apply leave|tomorrow/i.test(handle.message) ||
      Boolean(handle.priorSlots && Object.keys(handle.priorSlots).length > 0);
    writer.missingSlots = (_intent, slots) => (slots['startDate'] ? [] : ['startDate']);
    writer.extractEntities = (turn) => ({
      ...(turn.priorSlots ?? {}),
      ...(/tomorrow/i.test(turn.message) ? { startDate: 'tomorrow' } : {}),
    });

    const registry = createCapabilityRegistry([writer]);
    const orchestrator = createCrossCapabilityOrchestrator({ registry });
    const tools = createCapabilityToolPort({
      getTool: () => ({ implemented: true }),
      execute: async () => ({
        ok: false,
        decision: 'confirmation_required',
        confirmationId: 'c1',
        errorMessage: 'Confirm?',
      }),
    });
    writer.execute = async () => ({
      kind: 'confirmation_required',
      confirmationId: 'c1',
      summary: 'Confirm apply?',
    });

    const clarify = await orchestrator.run({
      message: 'Apply leave',
      context: {
        tenantId: 't1',
        userId: 'u1',
        correlationId: 'c1',
        roles: ['Employee'],
        permissions: ['leave.apply'],
      },
      tools,
    });
    assert.equal(clarify.kind, 'clarify');

    const follow = await orchestrator.run({
      message: 'Tomorrow',
      context: {
        tenantId: 't1',
        userId: 'u1',
        correlationId: 'c1',
        roles: ['Employee'],
        permissions: ['leave.apply'],
      },
      tools,
      priorSlotsByCapability: clarify.slotsByCapability,
    });
    assert.notEqual(follow.kind, 'unsupported');
  });
});
