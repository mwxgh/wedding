import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsISO8601,
  IsObject,
  MaxDate,
  MinDate,
  ValidateNested,
} from 'class-validator';

import {
  type BaseFieldOptions,
  TransformEach,
  baseDecorators,
  composeDecorators,
  mainOptions,
} from './core.js';

export function EnumField(
  entity: object,
  options: BaseFieldOptions = {},
): PropertyDecorator {
  const [decorators, each] = baseDecorators(options);
  decorators.push(IsEnum(entity, mainOptions(options, each)));
  return composeDecorators(...decorators);
}

export interface DateFieldOptions extends BaseFieldOptions {
  min?: Date | (() => Date);
  max?: Date | (() => Date);
}

/** Date, converted to a `Date` object (accepts ISO strings and timestamps). */
export function DateField(options: DateFieldOptions = {}): PropertyDecorator {
  const { min, max } = options;
  const [decorators, each] = baseDecorators(options);
  decorators.push(
    TransformEach((v) => {
      if (typeof v !== 'string' && typeof v !== 'number') return v;
      const date = new Date(v);
      return Number.isNaN(date.getTime()) ? v : date;
    }),
    IsDate(mainOptions(options, each)),
  );
  if (min) decorators.push(MinDate(min, each));
  if (max) decorators.push(MaxDate(max, each));
  return composeDecorators(...decorators);
}

/** ISO 8601 date string, kept as a string. */
export function DateStringField(
  options: BaseFieldOptions = {},
): PropertyDecorator {
  const [decorators, each] = baseDecorators(options);
  decorators.push(IsISO8601({ strict: true }, mainOptions(options, each)));
  return composeDecorators(...decorators);
}

/** Nested object (or array of objects with `each`), validated recursively. */
export function ClassField(
  type: () => new (...args: never[]) => object,
  options: BaseFieldOptions = {},
): PropertyDecorator {
  const [decorators, each] = baseDecorators(options);
  decorators.push(
    IsObject(mainOptions(options, each)),
    ValidateNested(each),
    Type(type),
  );
  return composeDecorators(...decorators);
}

/** Free-form JSON object (no nested validation). Parses JSON strings from forms. */
export function JsonField(options: BaseFieldOptions = {}): PropertyDecorator {
  const [decorators, each] = baseDecorators(options);
  decorators.push(
    TransformEach((v) => {
      if (typeof v !== 'string') return v;
      try {
        return JSON.parse(v) as unknown;
      } catch {
        return v;
      }
    }),
    IsObject(mainOptions(options, each)),
  );
  return composeDecorators(...decorators);
}
