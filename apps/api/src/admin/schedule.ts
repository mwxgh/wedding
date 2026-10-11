import { BadRequestException } from '@nestjs/common';

import { type EventTiming, eventTimes, vnDay } from '@repo/contracts';
import type { Prisma } from '@repo/db';

type Tx = Prisma.TransactionClient;

const DAY_MS = 86_400_000;

/** The wedding day (`YYYY-MM-DD`), or a 400 when it was never set. */
export async function weddingDay(tx: Tx) {
  const info = await tx.weddingInfo.findUnique({
    where: { id: 1 },
    select: { weddingDate: true },
  });
  if (!info)
    throw new BadRequestException(
      'Chưa có thông tin đám cưới. Hãy lưu ngày cưới trong Cài đặt trước.',
    );
  return vnDay(info.weddingDate);
}

/** Columns to write for an event's timing; timestamps always derived. */
export const eventTimingData = (day: string, t: EventTiming) => ({
  dayOffset: t.dayOffset,
  startTime: t.startTime,
  endTime: t.endTime ?? null,
  ...eventTimes(day, t),
});

interface EventVenue {
  venueName?: string;
  address?: string;
  mapUrl?: string | null;
}

/** Timing plus whichever venue fields were sent (absent = unchanged). */
const eventData = (
  day: string,
  { venueName, address, mapUrl, ...timing }: EventTiming & EventVenue,
) => ({
  ...eventTimingData(day, timing),
  ...(venueName === undefined ? {} : { venueName }),
  ...(address === undefined ? {} : { address }),
  ...(mapUrl === undefined ? {} : { mapUrl: mapUrl || null }),
});

/**
 * Moves the wedding to `day`, optionally re-timing / re-locating events, then re-derives
 * every event's timestamps and moves open tasks and expense due dates by the
 * same number of days. Returns how many tasks moved.
 */
export async function applySchedule(
  tx: Tx,
  day: string,
  timings: (EventTiming & EventVenue & { id: string })[] = [],
) {
  const before = await weddingDay(tx);
  await tx.weddingInfo.update({
    where: { id: 1 },
    data: {
      weddingDate: eventTimes(day, { dayOffset: 0, startTime: '00:00' })
        .startAt,
    },
  });

  const override = new Map(timings.map((t) => [t.id, t]));
  const events = await tx.event.findMany({
    select: { id: true, dayOffset: true, startTime: true, endTime: true },
  });
  const unknown = timings.find((t) => !events.some((e) => e.id === t.id));
  if (unknown) throw new BadRequestException('Sự kiện không tồn tại');
  await Promise.all(
    events.map((e) =>
      tx.event.update({
        where: { id: e.id },
        data: eventData(day, override.get(e.id) ?? e),
      }),
    ),
  );

  const delta =
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${before}T00:00:00Z`)) /
    DAY_MS;
  if (!delta) return 0;
  const shift = (d: Date) => new Date(d.getTime() + delta * DAY_MS);
  const [tasks, expenses] = await Promise.all([
    tx.task.findMany({
      where: { doneAt: null, dueDate: { not: null } },
      select: { id: true, dueDate: true },
    }),
    tx.expense.findMany({
      where: { dueDate: { not: null } },
      select: { id: true, dueDate: true },
    }),
  ]);
  await Promise.all([
    ...tasks.map((t) =>
      tx.task.update({
        where: { id: t.id },
        data: { dueDate: shift(t.dueDate!) },
      }),
    ),
    ...expenses.map((e) =>
      tx.expense.update({
        where: { id: e.id },
        data: { dueDate: shift(e.dueDate!) },
      }),
    ),
  ]);
  return tasks.length;
}
