import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsOptional,
  ValidateIf,
  type ValidationOptions,
} from 'class-validator';

export interface BaseFieldOptions {
  /** `undefined` (missing) is allowed; other validators are skipped. */
  optional?: boolean;
  /** `null` is allowed; other validators are skipped. */
  nullable?: boolean;
  /** Value is an array; every validator applies to each item. */
  each?: boolean;
  minItems?: number;
  maxItems?: number;
  /** Array items must be unique. */
  uniqueItems?: boolean;
  /** Custom message for the field's main type check. */
  message?: string;
}

/** Combine property decorators into one (framework-agnostic `applyDecorators`). */
export function composeDecorators(
  ...decorators: PropertyDecorator[]
): PropertyDecorator {
  return (target, key) => {
    for (const decorator of decorators) decorator(target, key);
  };
}

function presence({ optional, nullable }: BaseFieldOptions): PropertyDecorator {
  if (optional && nullable) return IsOptional();
  if (optional || nullable) {
    const skipped = optional ? undefined : null;
    return (target, key) =>
      ValidateIf(
        (obj: Record<string | symbol, unknown>) => obj[key] !== skipped,
      )(target, key);
  }
  return IsDefined();
}

/**
 * Decorators shared by every field: presence (required / optional / nullable)
 * and array rules. Returns them plus the validation options for item validators.
 */
export function baseDecorators(
  options: BaseFieldOptions,
): [PropertyDecorator[], ValidationOptions] {
  const decorators = [presence(options)];
  if (options.each) {
    decorators.push(IsArray());
    if (options.minItems !== undefined)
      decorators.push(ArrayMinSize(options.minItems));
    if (options.maxItems !== undefined)
      decorators.push(ArrayMaxSize(options.maxItems));
    if (options.uniqueItems) decorators.push(ArrayUnique());
  }
  return [decorators, { each: options.each }];
}

/** Validation options for the main type check, including the custom message. */
export const mainOptions = (
  options: BaseFieldOptions,
  each: ValidationOptions,
): ValidationOptions =>
  options.message ? { ...each, message: options.message } : each;

/** `@Transform` that maps the value, or each item when it is an array. */
export const TransformEach = (fn: (value: unknown) => unknown) =>
  Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map(fn) : fn(value),
  );
