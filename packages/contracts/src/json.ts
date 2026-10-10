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
