/**
 * Folds Vietnamese text for accent- and case-insensitive search:
 * "Đặng Thị Ánh" → "dang thi anh".
 */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

/** True when every word of `query` appears in one of `fields` (accents ignored). */
export const matchesQuery = (
  query: string,
  ...fields: (string | null | undefined)[]
) => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold(fields.filter(Boolean).join(' '));
  return words.every((w) => haystack.includes(w));
};
