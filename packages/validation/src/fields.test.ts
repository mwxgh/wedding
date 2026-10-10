import 'reflect-metadata';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  BigIntField,
  BooleanField,
  ClassField,
  CuidField,
  DateField,
  DateStringField,
  EmailField,
  EnumField,
  IntField,
  JsonField,
  NumberField,
  PasswordField,
  PhoneField,
  StringField,
  UrlField,
  UuidField,
} from './index.js';

/** Transform + validate like Nest's ValidationPipe({ transform: true }). */
async function check<T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
) {
  const value = plainToInstance(cls, plain);
  const errors = await validate(value);
  const failed = (e: (typeof errors)[number], path = ''): string[] =>
    e.constraints
      ? [`${path}${e.property}`]
      : (e.children ?? []).flatMap((c) => failed(c, `${path}${e.property}.`));
  return { value, failed: errors.flatMap((e) => failed(e)) };
}

describe('presence', () => {
  class Dto {
    @StringField() required: string;
    @StringField({ optional: true }) optional?: string;
    @StringField({ nullable: true }) nullable: string | null;
    @StringField({ optional: true, nullable: true }) both?: string | null;
  }

  it('required rejects missing and null', async () => {
    const { failed } = await check(Dto, { nullable: 'x' });
    assert.deepEqual(failed, ['required']);
    assert.deepEqual(
      (await check(Dto, { required: null, nullable: 'x' })).failed,
      ['required'],
    );
  });

  it('optional allows undefined but not null', async () => {
    assert.deepEqual(
      (await check(Dto, { required: 'a', nullable: 'x' })).failed,
      [],
    );
    assert.deepEqual(
      (await check(Dto, { required: 'a', nullable: 'x', optional: null }))
        .failed,
      ['optional'],
    );
  });

  it('nullable allows null but not undefined', async () => {
    assert.deepEqual(
      (await check(Dto, { required: 'a', nullable: null })).failed,
      [],
    );
    assert.deepEqual((await check(Dto, { required: 'a' })).failed, [
      'nullable',
    ]);
  });

  it('optional + nullable allows both', async () => {
    const { failed } = await check(Dto, {
      required: 'a',
      nullable: 'x',
      both: null,
    });
    assert.deepEqual(failed, []);
  });
});

describe('StringField', () => {
  class Dto {
    @StringField({ minLength: 2, maxLength: 5 }) name: string;
    @StringField({ optional: true }) note?: string;
    @StringField({ toUpperCase: true, length: 3 }) code: string;
    @StringField({ pattern: /^\d+$/ }) digits: string;
    @StringField({ each: true, minItems: 1, uniqueItems: true }) tags: string[];
  }
  const ok = { name: 'Hà', code: 'abc', digits: '123', tags: ['a'] };

  it('trims, transforms and validates', async () => {
    const { value, failed } = await check(Dto, {
      ...ok,
      name: '  Hà  ',
      note: '   ',
    });
    assert.deepEqual(failed, []);
    assert.equal(value.name, 'Hà');
    assert.equal(value.note, undefined); // optional: '' -> undefined
    assert.equal(value.code, 'ABC');
  });

  it('rejects bad values', async () => {
    const { failed } = await check(Dto, {
      name: '   x  ',
      code: 'abcd',
      digits: '12a',
      tags: ['a', 'a'],
    });
    assert.deepEqual(failed.sort(), ['code', 'digits', 'name', 'tags']);
  });

  it('validates each item and array size', async () => {
    assert.deepEqual((await check(Dto, { ...ok, tags: [] })).failed, ['tags']);
    assert.deepEqual((await check(Dto, { ...ok, tags: ['a', 1] })).failed, [
      'tags',
    ]);
  });
});

describe('format strings', () => {
  class Dto {
    @EmailField({ optional: true }) email?: string;
    @UrlField({ optional: true }) url?: string;
    @UuidField({ optional: true, version: '4' }) uuid?: string;
    @CuidField({ optional: true }) id?: string;
    @PhoneField({ optional: true }) phone?: string;
    @PasswordField({ optional: true, strong: true }) password?: string;
  }

  it('accepts valid values and normalizes them', async () => {
    const { value, failed } = await check(Dto, {
      email: '  Admin@Example.COM ',
      url: 'http://localhost:3000/path',
      uuid: '9b2f3c1e-6c0a-4d6e-9a43-5c8f0f6b2a11',
      id: 'cmv2a7nw50002mlo81x6j2ah6',
      phone: '090 123.4567',
      password: ' Abc123!x',
    });
    assert.deepEqual(failed, []);
    assert.equal(value.email, 'admin@example.com');
    assert.equal(value.phone, '0901234567');
    assert.equal(value.password, ' Abc123!x'); // passwords are never trimmed
  });

  it('rejects invalid values', async () => {
    const { failed } = await check(Dto, {
      email: 'nope',
      url: 'ftp://example.com',
      uuid: 'not-a-uuid',
      id: 'abc',
      phone: '123',
      password: 'weakpass',
    });
    assert.deepEqual(failed.sort(), [
      'email',
      'id',
      'password',
      'phone',
      'url',
      'uuid',
    ]);
  });
});

describe('UuidField version 7', () => {
  class Dto {
    @UuidField({ version: '7', each: true }) ids: string[];
  }

  it('accepts v7 and rejects v4', async () => {
    const v7 = '01a12594-a2f4-7608-9bf0-7b994bd1473e';
    const v4 = '9dd4ef23-37f5-4c70-8380-e9d2e2b03b82';
    assert.deepEqual((await check(Dto, { ids: [v7] })).failed, []);
    assert.deepEqual((await check(Dto, { ids: [v7, v4] })).failed, ['ids']);
  });
});

describe('messages', () => {
  class Dto {
    @CuidField({ each: true }) ids: string[];
    @StringField({ message: 'Tên không hợp lệ' }) name: string;
  }

  it('reports one readable message per problem', async () => {
    const errors = await validate(
      plainToInstance(Dto, { ids: ['x'], name: 1 }),
    );
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    assert.deepEqual(messages.sort(), [
      'Tên không hợp lệ',
      'each value in ids must be a valid id',
    ]);
  });
});

describe('numbers and booleans', () => {
  class Dto {
    @NumberField({ min: 0, max: 10, maxDecimalPlaces: 2 }) price: number;
    @IntField({ positive: true }) qty: number;
    @IntField({ optional: true, multipleOf: 1000 }) vnd?: number;
    @BigIntField({ min: 0n, optional: true }) big?: bigint;
    @BooleanField() active: boolean;
    @IntField({ each: true, optional: true }) ids?: number[];
  }

  it('converts strings from forms', async () => {
    const { value, failed } = await check(Dto, {
      price: '9.5',
      qty: '3',
      vnd: '200000',
      big: '9007199254740993',
      active: 'false',
      ids: ['1', '2'],
    });
    assert.deepEqual(failed, []);
    assert.equal(value.price, 9.5);
    assert.equal(value.qty, 3);
    assert.equal(value.big, 9007199254740993n);
    assert.equal(value.active, false);
    assert.deepEqual(value.ids, [1, 2]);
  });

  it('rejects invalid numbers', async () => {
    const { failed } = await check(Dto, {
      price: 1.234,
      qty: 0,
      vnd: 1500,
      big: '-1',
      active: 'yes',
      ids: [1.5],
    });
    assert.deepEqual(failed.sort(), [
      'active',
      'big',
      'ids',
      'price',
      'qty',
      'vnd',
    ]);
  });
});

describe('enums, dates, nested, json', () => {
  const Side = { BRIDE: 'BRIDE', GROOM: 'GROOM' } as const;
  class Item {
    @StringField({ minLength: 1 }) name: string;
  }
  class Dto {
    @EnumField(Side) side: string;
    @DateField({ min: new Date('2020-01-01') }) at: Date;
    @DateStringField({ optional: true }) day?: string;
    @ClassField(() => Item, { each: true, minItems: 1 }) items: Item[];
    @ClassField(() => Item, { optional: true }) main?: Item;
    @JsonField({ optional: true }) meta?: Record<string, unknown>;
  }

  it('accepts valid values', async () => {
    const { value, failed } = await check(Dto, {
      side: 'BRIDE',
      at: '2027-01-16T11:00:00+07:00',
      day: '2027-01-16',
      items: [{ name: 'a' }],
      main: { name: 'b' },
      meta: '{"a":1}',
    });
    assert.deepEqual(failed, []);
    assert.ok(value.at instanceof Date);
    assert.ok(value.items[0] instanceof Item);
    assert.deepEqual(value.meta, { a: 1 });
  });

  it('reports nested errors by path', async () => {
    const { failed } = await check(Dto, {
      side: 'X',
      at: '2019-12-31',
      day: '2027-13-40',
      items: [{ name: '' }],
      main: 'oops',
      meta: 'not json',
    });
    assert.deepEqual(failed.sort(), [
      'at',
      'day',
      'items.0.name',
      'main',
      'meta',
      'side',
    ]);
  });
});
