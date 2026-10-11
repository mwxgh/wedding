/**
 * One source of truth for the wedding schedule: the wedding *day*. Events are
 * stored as "N days from the wedding day, at HH:mm" and their timestamps are
 * always derived from it, so moving the day moves everything with it.
 *
 * All calendar math happens in Vietnam time. Days are `YYYY-MM-DD`, times
 * `HH:mm`.
 */

export const WEDDING_TZ = 'Asia/Ho_Chi_Minh';
const UTC_OFFSET = '+07:00';
const DAY_MS = 86_400_000;

export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Calendar day of an instant in Vietnam time. */
export const vnDay = (at: Date | string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: WEDDING_TZ }).format(
    new Date(at),
  );

/** Wall-clock time of an instant in Vietnam time. */
export const vnTime = (at: Date | string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: WEDDING_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(at));

/** The instant of `day` at `time` in Vietnam. */
export const atVn = (day: string, time = '00:00') =>
  new Date(`${day}T${time}:00${UTC_OFFSET}`);

export const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** Whole calendar days from `from` to `to`. */
export const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );

export interface EventTiming {
  /** Days from the wedding day: 0 = that day, -1 = the day before. */
  dayOffset: number;
  startTime: string;
  /** Ends the next day when earlier than `startTime`. */
  endTime?: string | null;
}

/** Timestamps of an event from the wedding day. */
export function eventTimes(weddingDay: string, t: EventTiming) {
  const day = addDays(weddingDay, t.dayOffset);
  return {
    startAt: atVn(day, t.startTime),
    endAt: t.endTime
      ? atVn(t.endTime < t.startTime ? addDays(day, 1) : day, t.endTime)
      : null,
  };
}

/** The reverse of `eventTimes`, for showing a stored event in a form. */
export function eventTiming(
  weddingDate: Date | string,
  event: { startAt: Date | string; endAt?: Date | string | null },
): EventTiming {
  return {
    dayOffset: daysBetween(vnDay(weddingDate), vnDay(event.startAt)),
    startTime: vnTime(event.startAt),
    endTime: event.endAt ? vnTime(event.endAt) : null,
  };
}

/**
 * What the countdown aims at: the first event on the wedding day, or the
 * start of the day when there is none.
 */
export function weddingStart(
  weddingDate: Date | string,
  events: { startAt: Date | string }[],
) {
  const day = vnDay(weddingDate);
  const first = events
    .filter((e) => vnDay(e.startAt) === day)
    .map((e) => new Date(e.startAt))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return first ?? atVn(day);
}
