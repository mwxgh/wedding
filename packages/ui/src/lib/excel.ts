/**
 * Typed column definitions → .xlsx download, generated in the browser.
 * The writer is loaded on demand so it stays out of the page bundle.
 */

export type ExcelValue = string | number | boolean | Date | null | undefined;

/** `money` and `int` expect numbers; `date`/`datetime` take a Date or ISO string. */
export type ExcelFormat = 'text' | 'int' | 'money' | 'date' | 'datetime';

export interface ExcelColumn<T> {
  header: string;
  value: (row: T, index: number) => ExcelValue;
  format?: ExcelFormat;
  /** Width in characters. */
  width?: number;
}

export interface ExcelSheet<T> {
  /** Max 31 characters; `[]:*?/\` are stripped. */
  name: string;
  rows: readonly T[];
  columns: ExcelColumn<T>[];
}

/** Erases the row type so sheets of different rows fit in one workbook. */
export type AnyExcelSheet = ExcelSheet<never>;
export const excelSheet = <T>(sheet: ExcelSheet<T>) =>
  sheet as unknown as AnyExcelSheet;

const NUMBER_FORMAT: Partial<Record<ExcelFormat, string>> = {
  int: '#,##0',
  money: '#,##0" ₫"',
  date: 'dd/mm/yyyy',
  datetime: 'dd/mm/yyyy hh:mm',
};

const HEADER = {
  fontWeight: 'bold',
  backgroundColor: '#F3ECE8',
  borderStyle: 'thin',
  borderColor: '#D6CBC4',
} as const;

/**
 * Excel dates have no time zone, so write the wall-clock time of `timeZone`
 * (the writer reads a Date as UTC).
 */
function wallClock(value: Date | string, timeZone: string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<string, number>;
  return new Date(
    Date.UTC(
      parts.year!,
      parts.month! - 1,
      parts.day!,
      parts.hour!,
      parts.minute!,
      parts.second!,
    ),
  );
}

function cell(value: ExcelValue, format: ExcelFormat, timeZone: string) {
  if (value === null || value === undefined || value === '') return null;
  if (format === 'date' || format === 'datetime') {
    const date =
      value instanceof Date || typeof value === 'string'
        ? wallClock(value, timeZone)
        : null;
    return date
      ? { value: date, type: Date, format: NUMBER_FORMAT[format] }
      : String(value);
  }
  if (format === 'money' || format === 'int') {
    const n = Number(value);
    return Number.isFinite(n)
      ? { value: n, type: Number, format: NUMBER_FORMAT[format] }
      : String(value);
  }
  if (typeof value === 'boolean') return value ? 'Có' : '';
  return value instanceof Date ? value.toISOString() : value;
}

const sheetName = (name: string) =>
  name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Sheet';

/** `"Khách mời"` → `"khach-moi-2026-10-11.xlsx"` */
export const excelFileName = (base: string) => {
  const slug = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const day = new Intl.DateTimeFormat('en-CA').format(new Date());
  return `${slug || 'export'}-${day}.xlsx`;
};

export async function downloadExcel(
  fileName: string,
  sheets: AnyExcelSheet[],
  { timeZone = 'Asia/Ho_Chi_Minh' }: { timeZone?: string } = {},
) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const used = new Set<string>();
  await writeExcelFile(
    sheets.map((s) => {
      // sheet names must be unique within a workbook
      let name = sheetName(s.name);
      for (let i = 2; used.has(name); i++)
        name = `${sheetName(s.name).slice(0, 28)} ${i}`;
      used.add(name);
      const columns = s.columns as ExcelColumn<unknown>[];
      return {
        sheet: name,
        stickyRowsCount: 1,
        columns: columns.map((c) => ({
          width: c.width ?? Math.max(10, Math.min(40, c.header.length + 4)),
        })),
        data: [
          columns.map((c) => ({ value: c.header, ...HEADER })),
          ...(s.rows as readonly unknown[]).map((row, i) =>
            columns.map((c) =>
              cell(c.value(row, i), c.format ?? 'text', timeZone),
            ),
          ),
        ],
      };
    }),
    { fontFamily: 'Arial', fontSize: 11 },
  ).toFile(fileName);
}
