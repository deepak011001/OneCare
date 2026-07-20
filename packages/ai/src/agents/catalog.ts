export const DOMAIN_AGENT_IDS = [
  'employee',
  'manager',
  'hr',
  'knowledge',
  'finance',
  'it',
  'recruitment',
  'learning',
  'notification',
  'workflow',
] as const;

export type DomainAgentId = (typeof DOMAIN_AGENT_IDS)[number];

export interface AgentCapability {
  readonly id: string;
  readonly description: string;
}

export interface RegisteredAgent {
  readonly id: DomainAgentId;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly supportedIntents: readonly string[];
  readonly capabilities: readonly AgentCapability[];
  readonly allowedTools: readonly string[];
  readonly systemPromptRef: string;
  readonly enabled: boolean;
}

export const PLACEHOLDER_AGENTS: readonly RegisteredAgent[] = [
  {
    id: 'employee',
    name: 'EmployeeAgent',
    version: '0.1.0',
    description: 'Employee self-service intents (ESS). No domain implementation in M3.',
    supportedIntents: ['employee.self_service', 'leave.read', 'attendance.read'],
    capabilities: [
      { id: 'ess.read', description: 'Route ESS read intents' },
      { id: 'ess.write.future', description: 'Future mutating ESS actions via MCP' },
    ],
    allowedTools: ['leaveBalance', 'attendance'],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
  {
    id: 'manager',
    name: 'ManagerAgent',
    version: '0.1.0',
    description: 'Manager services (MSS) placeholder.',
    supportedIntents: ['manager.approvals'],
    capabilities: [{ id: 'mss.approvals', description: 'Route approval intents' }],
    allowedTools: ['approveRequest'],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
  {
    id: 'hr',
    name: 'HRAgent',
    version: '0.1.0',
    description: 'HR cases and policy routing placeholder.',
    supportedIntents: ['hr.case'],
    capabilities: [{ id: 'hr.case', description: 'Route HR case intents' }],
    allowedTools: ['searchKnowledge'],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
  {
    id: 'knowledge',
    name: 'KnowledgeAgent',
    version: '0.1.0',
    description: 'Knowledge routing placeholder (no RAG in M3).',
    supportedIntents: ['knowledge.search', 'general.assist'],
    capabilities: [{ id: 'knowledge.route', description: 'Route knowledge questions' }],
    allowedTools: ['searchKnowledge'],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
  {
    id: 'finance',
    name: 'FinanceAgent',
    version: '0.1.0',
    description: 'Finance intents placeholder.',
    supportedIntents: ['finance.query'],
    capabilities: [{ id: 'finance.route', description: 'Route finance intents' }],
    allowedTools: [],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
  {
    id: 'it',
    name: 'ITAgent',
    version: '0.1.0',
    description: 'IT support intents placeholder.',
    supportedIntents: ['it.support'],
    capabilities: [{ id: 'it.route', description: 'Route IT intents' }],
    allowedTools: [],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
  {
    id: 'recruitment',
    name: 'RecruitmentAgent',
    version: '0.1.0',
    description: 'Recruitment intents placeholder.',
    supportedIntents: ['recruitment.query'],
    capabilities: [{ id: 'recruitment.route', description: 'Route recruitment intents' }],
    allowedTools: [],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
  {
    id: 'learning',
    name: 'LearningAgent',
    version: '0.1.0',
    description: 'Learning intents placeholder.',
    supportedIntents: ['learning.query'],
    capabilities: [{ id: 'learning.route', description: 'Route learning intents' }],
    allowedTools: [],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
  {
    id: 'notification',
    name: 'NotificationAgent',
    version: '0.1.0',
    description: 'Notification fan-out placeholder.',
    supportedIntents: ['notification.send'],
    capabilities: [{ id: 'notify.route', description: 'Route notification intents' }],
    allowedTools: ['sendNotification'],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
  {
    id: 'workflow',
    name: 'WorkflowAgent',
    version: '0.1.0',
    description: 'Long-running workflow placeholder.',
    supportedIntents: ['workflow.run'],
    capabilities: [{ id: 'workflow.route', description: 'Route workflow intents' }],
    allowedTools: [],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
  },
];
