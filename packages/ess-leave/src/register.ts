import { createCapabilityRegistry, type CapabilityRegistry } from '@onecare/ess-capability';
import { createLeaveCapability } from './capability';

/** Composition root helper — Employee Agent discovers capabilities via this registry. */
export function createEmployeeCapabilityRegistry(
  options?: Parameters<typeof createCapabilityRegistry>[1],
): CapabilityRegistry {
  return createCapabilityRegistry([createLeaveCapability()], options);
}
