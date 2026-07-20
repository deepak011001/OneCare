import { Inject, Injectable } from '@nestjs/common';
import { createAttendanceCapability } from '@onecare/ess-attendance';
import { createKnowledgeCapability, type KnowledgeRetrievalPort } from '@onecare/ess-knowledge';
import { createEmployeeCapabilityRegistry } from '@onecare/ess-leave';
import { APP_TOKENS } from '../../../shared/tokens';

@Injectable()
export class EmployeeCapabilitiesService {
  private readonly registry;

  constructor(@Inject(APP_TOKENS.KNOWLEDGE_RETRIEVAL) retrieval: KnowledgeRetrievalPort) {
    this.registry = createEmployeeCapabilityRegistry(undefined, [
      createAttendanceCapability(),
      createKnowledgeCapability({ retrieval }),
    ]);
  }

  list() {
    return this.registry.list().map((c) => ({
      id: c.id,
      name: c.name,
      version: c.version,
      description: c.description,
      supportedIntents: c.supportedIntents,
      supportedTools: c.supportedTools,
      requiredPermissions: c.requiredPermissions,
      priority: c.priority,
      enabled: c.enabled,
    }));
  }

  widgets() {
    return this.registry.allDashboardWidgets();
  }

  prompts() {
    return this.registry.allSuggestedPrompts();
  }

  help() {
    return this.registry.allHelp();
  }
}
