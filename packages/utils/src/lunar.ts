/**
 * Vietnamese lunar calendar (âm lịch), after Hồ Ngọc Đức's algorithm
 * (https://www.informatik.uni-leipzig.de/~duc/amlich/), computed for UTC+7.
 * Valid for years 1800–2199.
 */

const TZ_HOURS = 7;

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  /** True when the month is a leap month (tháng nhuận). */
  leap: boolean;
}

const jdFromDate = (dd: number, mm: number, yy: number): number => {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) {
    jd =
      dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
};

/** Julian day of the k-th new moon after 1900-01-01, at local midnight. */
const newMoonDay = (k: number): number => {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 =
    C1 -
    0.0074 * Math.sin(dr * (M - Mpr)) +
    0.0004 * Math.sin(dr * (2 * F + M));
  C1 =
    C1 -
    0.0004 * Math.sin(dr * (2 * F - M)) -
    0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 =
    C1 +
    0.001 * Math.sin(dr * (2 * F - Mpr)) +
    0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat =
    T < -11
      ? 0.001 +
        0.000839 * T +
        0.0002261 * T2 -
        0.00000845 * T3 -
        0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  const JdNew = Jd1 + C1 - deltat;
  return Math.floor(JdNew + 0.5 + TZ_HOURS / 24);
};

/** Sun longitude sector (0..11) at local midnight of Julian day `jdn`. */
const sunLongitude = (jdn: number): number => {
  const T = (jdn - 2451545.5 - TZ_HOURS / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL +=
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L -= Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return Math.floor((L / Math.PI) * 6);
};

/** Day of the new moon that starts lunar month 11 of year `yy`. */
const lunarMonth11 = (yy: number): number => {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = newMoonDay(k);
  if (sunLongitude(nm) >= 9) nm = newMoonDay(k - 1);
  return nm;
};

const leapMonthOffset = (a11: number): number => {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last: number;
  let i = 1;
  let arc = sunLongitude(newMoonDay(k + i));
  do {
    last = arc;
    i++;
    arc = sunLongitude(newMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
};

/** Convert a solar (Gregorian) date to the Vietnamese lunar date. */
export function solarToLunar(dd: number, mm: number, yy: number): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = newMoonDay(k);

  let a11 = lunarMonth11(yy);
  let b11 = a11;
  let year: number;
  if (a11 >= monthStart) {
    year = yy;
    a11 = lunarMonth11(yy - 1);
  } else {
    year = yy + 1;
    b11 = lunarMonth11(yy + 1);
  }

  const day = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let leap = false;
  let month = diff + 11;
  if (b11 - a11 > 365) {
    const leapDiff = leapMonthOffset(a11);
    if (diff >= leapDiff) {
      month = diff + 10;
      if (diff === leapDiff) leap = true;
    }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) year -= 1;
  return { day, month, year, leap };
}

const CAN = [
  'Giáp',
  'Ất',
  'Bính',
  'Đinh',
  'Mậu',
  'Kỷ',
  'Canh',
  'Tân',
  'Nhâm',
  'Quý',
];
const CHI = [
  'Tý',
  'Sửu',
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi',
];

/** Can chi name of a lunar year, e.g. 2025 -> "Ất Tỵ". */
export const canChiYear = (lunarYear: number): string =>
  `${CAN[(lunarYear + 6) % 10]} ${CHI[(lunarYear + 8) % 12]}`;

/** Lunar date of an instant, read as a calendar day in Vietnam (UTC+7). */
export function lunarDateOf(instant: Date | string): LunarDate {
  const local = new Date(new Date(instant).getTime() + TZ_HOURS * 3600_000);
  return solarToLunar(
    local.getUTCDate(),
    local.getUTCMonth() + 1,
    local.getUTCFullYear(),
  );
}

/**
 * Lunar date as written on Vietnamese invitations,
 * e.g. "ngày 15 tháng 8 năm Ất Tỵ" ("tháng 6 nhuận" for leap months).
 */
export function formatLunarDate(instant: Date | string): string {
  const { day, month, year, leap } = lunarDateOf(instant);
  return `ngày ${day} tháng ${month}${leap ? ' nhuận' : ''} năm ${canChiYear(year)}`;
}
