'use client';

import { type EventTimingInput, addDays, atVn } from '@repo/contracts';
import { Input } from '@repo/ui/components/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@repo/ui/components/native-select';

import { FormField } from '../../_components/common';
import { formatDate } from '../../_lib/format';

/** A calendar day (`YYYY-MM-DD`) in words, e.g. "Chủ Nhật, 14/02/2027". */
export const formatWeddingDay = (day: string) =>
  formatDate(atVn(day).toISOString());

export const offsetLabel = (offset: number) =>
  offset === 0
    ? 'Ngày cưới'
    : offset < 0
      ? `Trước ${-offset} ngày`
      : `Sau ${offset} ngày`;

// ăn hỏi is often weeks before; a few days after covers lại mặt
const OFFSETS = Array.from({ length: 75 }, (_, i) => i - 60);

export const emptyTiming: EventTimingInput = {
  dayOffset: 0,
  startTime: '',
  endTime: null,
};

/**
 * Day (relative to the wedding day) plus start / end time. The real date is
 * shown next to each choice so nobody has to count days.
 */
export function EventTimingFields({
  value,
  onChange,
  weddingDay,
}: {
  value: EventTimingInput;
  onChange: (next: EventTimingInput) => void;
  /** `YYYY-MM-DD`, or null when the wedding day is not set yet. */
  weddingDay: string | null;
}) {
  const offsets = OFFSETS.includes(value.dayOffset)
    ? OFFSETS
    : [...OFFSETS, value.dayOffset].sort((a, b) => a - b);
  return (
    <div
      className={`grid gap-3
        sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]`}
    >
      <FormField label="Ngày">
        <NativeSelect
          className="w-full"
          aria-label="Ngày"
          value={value.dayOffset}
          onChange={(e) =>
            onChange({ ...value, dayOffset: Number(e.target.value) })
          }
        >
          {offsets.map((o) => (
            <NativeSelectOption key={o} value={o}>
              {offsetLabel(o)}
              {weddingDay && ` · ${formatWeddingDay(addDays(weddingDay, o))}`}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Bắt đầu">
        <Input
          type="time"
          aria-label="Giờ bắt đầu"
          value={value.startTime}
          onChange={(e) => onChange({ ...value, startTime: e.target.value })}
          required
        />
      </FormField>
      <FormField label="Kết thúc (không bắt buộc)">
        <Input
          type="time"
          aria-label="Giờ kết thúc"
          value={value.endTime ?? ''}
          onChange={(e) =>
            onChange({ ...value, endTime: e.target.value || null })
          }
        />
      </FormField>
    </div>
  );
}
