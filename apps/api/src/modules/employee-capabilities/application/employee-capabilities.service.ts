import { Injectable } from '@nestjs/common';
import { createEmployeeCapabilityRegistry } from '@onecare/ess-leave';

@Injectable()
export class EmployeeCapabilitiesService {
  private readonly registry = createEmployeeCapabilityRegistry();

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
