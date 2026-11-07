import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fold, matchesQuery } from './text.js';

describe('fold', () => {
  it('strips Vietnamese accents, đ and case', () => {
    assert.equal(fold('Đặng Thị Ánh'), 'dang thi anh');
    assert.equal(fold('Nguyễn Văn Dũng'), 'nguyen van dung');
    assert.equal(fold('ĐỖ HOÀNG'), 'do hoang');
  });

  it('handles precomposed and decomposed input alike', () => {
    assert.equal(fold('Ánh'.normalize('NFC')), fold('Ánh'.normalize('NFD')));
  });
});

describe('matchesQuery', () => {
  it('matches every word without accents across fields', () => {
    assert.ok(matchesQuery('anh nam', 'Gia đình anh Nam'));
    assert.ok(matchesQuery('dung', 'Bạn bè', 'Dũng'));
    assert.ok(matchesQuery('0912', 'Lan', null, '0912 345 678'));
    assert.ok(!matchesQuery('hoa', 'Gia đình anh Nam'));
  });

  it('matches everything for an empty query', () => {
    assert.ok(matchesQuery('  ', 'x'));
  });
});
