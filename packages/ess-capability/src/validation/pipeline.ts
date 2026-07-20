import type {
  CapabilityRuntimeContext,
  SlotBag,
  ValidationIssue,
  ValidationResult,
} from '../types';

export type ValidatorFn = (input: ValidatorInput) => readonly ValidationIssue[];

export interface ValidatorInput {
  readonly intent: string;
  readonly slots: SlotBag;
  readonly context?: CapabilityRuntimeContext;
  readonly requiredPermissions?: readonly string[];
  readonly availableTools?: readonly string[];
  readonly requiredTools?: readonly string[];
  readonly extras?: Readonly<Record<string, unknown>>;
}

export function requiredFieldsValidator(fields: readonly string[]): ValidatorFn {
  return (input) => {
    const issues: ValidationIssue[] = [];
    for (const field of fields) {
      const value = input.slots[field];
      if (value === undefined || value === null || value === '') {
        issues.push({
          code: 'REQUIRED_FIELD',
          message: `${field} is required.`,
          field,
          severity: 'error',
        });
      }
    }
    return issues;
  };
}

export function permissionValidator(): ValidatorFn {
  return (input) => {
    if (!input.requiredPermissions?.length || !input.context) return [];
    const missing = input.requiredPermissions.filter(
      (p) => !input.context!.permissions.includes(p),
    );
    if (missing.length === 0) return [];
    return [
      {
        code: 'PERMISSION_DENIED',
        message: `Missing permissions: ${missing.join(', ')}.`,
        severity: 'error',
      },
    ];
  };
}

export function toolAvailabilityValidator(): ValidatorFn {
  return (input) => {
    if (!input.requiredTools?.length) return [];
    const available = new Set(input.availableTools ?? []);
    const missing = input.requiredTools.filter((t) => !available.has(t));
    if (missing.length === 0) return [];
    return [
      {
        code: 'TOOL_UNAVAILABLE',
        message: `Required tools unavailable: ${missing.join(', ')}.`,
        severity: 'error',
      },
    ];
  };
}

/**
 * Ordered validation pipeline. Capabilities append domain validators.
 */
export class ValidationPipeline {
  private readonly validators: ValidatorFn[] = [];

  use(validator: ValidatorFn): this {
    this.validators.push(validator);
    return this;
  }

  run(input: ValidatorInput): ValidationResult {
    const issues = this.validators.flatMap((v) => v(input));
    const errors = issues.filter((i) => (i.severity ?? 'error') === 'error');
    return { ok: errors.length === 0, issues };
  }
}

export function createValidationPipeline(...validators: ValidatorFn[]): ValidationPipeline {
  const pipeline = new ValidationPipeline();
  for (const validator of validators) pipeline.use(validator);
  return pipeline;
}
