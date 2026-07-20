import {
  createCapabilityRegistry,
  type CapabilityRegistry,
  type EmployeeCapability,
} from '@onecare/ess-capability';
import { createLeaveCapability } from './capability';

/** Composition root helper — Employee Agent discovers capabilities via this registry. */
export function createEmployeeCapabilityRegistry(
  options?: Parameters<typeof createCapabilityRegistry>[1],
  extras: readonly EmployeeCapability[] = [],
): CapabilityRegistry {
  return createCapabilityRegistry([createLeaveCapability(), ...extras], options);
}
