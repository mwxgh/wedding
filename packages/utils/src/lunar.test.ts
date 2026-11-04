import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canChiYear, formatLunarDate, solarToLunar } from './lunar.js';

describe('solarToLunar', () => {
  it('finds Tết (1/1) of recent years', () => {
    assert.deepEqual(solarToLunar(22, 1, 2023), {
      day: 1,
      month: 1,
      year: 2023,
      leap: false,
    });
    assert.deepEqual(solarToLunar(10, 2, 2024), {
      day: 1,
      month: 1,
      year: 2024,
      leap: false,
    });
    assert.deepEqual(solarToLunar(29, 1, 2025), {
      day: 1,
      month: 1,
      year: 2025,
      leap: false,
    });
    assert.deepEqual(solarToLunar(17, 2, 2026), {
      day: 1,
      month: 1,
      year: 2026,
      leap: false,
    });
  });

  it('keeps the previous lunar year before Tết', () => {
    assert.deepEqual(solarToLunar(31, 12, 2024), {
      day: 1,
      month: 12,
      year: 2024,
      leap: false,
    });
  });

  it('marks the leap 6th month of Ất Tỵ (2025)', () => {
    assert.deepEqual(solarToLunar(25, 7, 2025), {
      day: 1,
      month: 6,
      year: 2025,
      leap: true,
    });
  });

  it('finds Mid-Autumn 2025 (15/8)', () => {
    assert.deepEqual(solarToLunar(6, 10, 2025), {
      day: 15,
      month: 8,
      year: 2025,
      leap: false,
    });
  });
});

describe('canChiYear', () => {
  it('names the sexagenary year', () => {
    assert.equal(canChiYear(2024), 'Giáp Thìn');
    assert.equal(canChiYear(2025), 'Ất Tỵ');
    assert.equal(canChiYear(2026), 'Bính Ngọ');
  });
});

describe('formatLunarDate', () => {
  it('reads the instant in Vietnam time', () => {
    // 2025-10-05T18:00Z is 01:00 on 6 Oct in Vietnam -> Mid-Autumn
    assert.equal(
      formatLunarDate('2025-10-05T18:00:00Z'),
      'ngày 15 tháng 8 năm Ất Tỵ',
    );
    assert.equal(
      formatLunarDate('2025-07-25T03:00:00Z'),
      'ngày 1 tháng 6 nhuận năm Ất Tỵ',
    );
  });
});
