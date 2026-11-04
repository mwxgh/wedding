export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type Prev = [never, 0, 1, 2, 3, 4];

// `[JsonValue] extends [V]` first: a structural `V extends JsonValue` check on a
// relation would make recursive models circular (TS2615).
type LimitValue<V, D extends number> = [JsonValue] extends [V]
  ? V
  : V extends readonly (infer E)[]
    ? LimitValue<E, D>[]
    : V extends object
      ? LimitDepth<V, D>
      : V;

/** Keeps `D` levels of nested relations; deeper ones collapse to `object`. */
export type LimitDepth<T, D extends number> = [D] extends [0]
  ? object
  : { [K in keyof T]: LimitValue<T[K], Prev[D]> };

/** `T` with the keys of `R` replaced, e.g. a model with the relations an endpoint includes. */
export type With<T, R> = Omit<T, keyof R> & R;

/**
 * The shape a value takes after `JSON.stringify` on the API:
 * Date -> ISO string, bigint -> string (see BigInt.prototype.toJSON in api/main.ts).
 */
export type Json<T> = T extends Date
  ? string
  : T extends bigint
    ? string
    : T extends (infer U)[]
      ? Json<U>[]
      : T extends object
        ? { [K in keyof T]: Json<T[K]> }
        : T;
