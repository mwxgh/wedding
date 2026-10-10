import {
  IsEmail,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
  IsUUID,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  type BaseFieldOptions,
  TransformEach,
  baseDecorators,
  composeDecorators,
  mainOptions,
} from './core.js';

export interface StringFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
  /** Exact length. */
  length?: number;
  pattern?: RegExp;
  /** Trim surrounding whitespace before validating. Default `true`. */
  trim?: boolean;
  /** Turn `''` (after trimming) into `undefined`. Default: same as `optional`. */
  emptyToUndefined?: boolean;
  toLowerCase?: boolean;
  toUpperCase?: boolean;
}

/** String field. Extra validators (email, url, …) are appended by the wrappers below. */
export function StringField(
  options: StringFieldOptions = {},
  ...extra: PropertyDecorator[]
): PropertyDecorator {
  const {
    minLength,
    maxLength,
    length,
    pattern,
    trim = true,
    emptyToUndefined = options.optional ?? false,
    toLowerCase,
    toUpperCase,
  } = options;
  const [decorators, each] = baseDecorators(options);

  decorators.push(
    TransformEach((v) => {
      if (typeof v !== 'string') return v;
      let s = trim ? v.trim() : v;
      if (toLowerCase) s = s.toLowerCase();
      if (toUpperCase) s = s.toUpperCase();
      return emptyToUndefined && s === '' ? undefined : s;
    }),
    IsString(mainOptions(options, each)),
  );
  if (length !== undefined) decorators.push(Length(length, length, each));
  if (minLength !== undefined) decorators.push(MinLength(minLength, each));
  if (maxLength !== undefined) decorators.push(MaxLength(maxLength, each));
  if (pattern) decorators.push(Matches(pattern, each));

  return composeDecorators(...decorators, ...extra);
}

/** Email, lowercased. */
export function EmailField(
  options: StringFieldOptions = {},
): PropertyDecorator {
  return StringField(
    { maxLength: 191, toLowerCase: true, ...options },
    IsEmail({}, { each: options.each }),
  );
}

export interface UrlFieldOptions extends StringFieldOptions {
  /** Default `['http', 'https']`. */
  protocols?: string[];
  /** Require a TLD (rejects `http://localhost`). Default `false`. */
  requireTld?: boolean;
}

export function UrlField(options: UrlFieldOptions = {}): PropertyDecorator {
  const { protocols = ['http', 'https'], requireTld = false } = options;
  return StringField(
    { maxLength: 2048, ...options },
    IsUrl(
      { protocols, require_protocol: true, require_tld: requireTld },
      { each: options.each },
    ),
  );
}

export interface UuidFieldOptions extends BaseFieldOptions {
  /** Default `'all'`. */
  version?: '1' | '2' | '3' | '4' | '5' | '7' | 'all';
}

export function UuidField(options: UuidFieldOptions = {}): PropertyDecorator {
  return StringField(
    options,
    IsUUID(options.version ?? 'all', { each: options.each }),
  );
}

/** Prisma `cuid()` id (v1: 25 chars starting with `c`). */
export function CuidField(options: BaseFieldOptions = {}): PropertyDecorator {
  return StringField(
    options,
    Matches(/^c[a-z0-9]{24}$/, {
      each: options.each,
      message:
        options.message ??
        `${options.each ? 'each value in ' : ''}$property must be a valid id`,
    }),
  );
}

/** Region code accepted by class-validator's `IsPhoneNumber` (e.g. 'VN', 'US'). */
export type PhoneRegion = NonNullable<Parameters<typeof IsPhoneNumber>[0]>;

export interface PhoneFieldOptions extends StringFieldOptions {
  /** Region used to parse numbers without a country code. Default `'VN'`. */
  region?: PhoneRegion;
}

/** Phone number; spaces, dots, dashes and parentheses are stripped first. */
export function PhoneField(options: PhoneFieldOptions = {}): PropertyDecorator {
  return composeDecorators(
    TransformEach((v) =>
      typeof v === 'string' ? v.replace(/[\s.\-()]/g, '') : v,
    ),
    StringField(
      { maxLength: 20, ...options },
      IsPhoneNumber(options.region ?? 'VN', { each: options.each }),
    ),
  );
}

export interface PasswordFieldOptions extends BaseFieldOptions {
  /** Default 8. */
  minLength?: number;
  /** Default 72 (bcrypt only uses the first 72 bytes). */
  maxLength?: number;
  /** Require lowercase, uppercase, number and symbol. Default `false`. */
  strong?: boolean;
}

/** Password: never trimmed or case-changed. */
export function PasswordField(
  options: PasswordFieldOptions = {},
): PropertyDecorator {
  const { minLength = 8, maxLength = 72, strong } = options;
  return StringField(
    { ...options, minLength, maxLength, trim: false, emptyToUndefined: false },
    ...(strong
      ? [
          IsStrongPassword(
            {
              minLength,
              minLowercase: 1,
              minUppercase: 1,
              minNumbers: 1,
              minSymbols: 1,
            },
            { each: options.each },
          ),
        ]
      : []),
  );
}
