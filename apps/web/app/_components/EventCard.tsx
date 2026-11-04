'use client';

import { CalendarDaysIcon, MapPinIcon } from 'lucide-react';

import type { EventJson } from '@repo/types';
import SpotlightCard from '@repo/ui/components/reactbits/spotlight-card';
import { formatLunarDate } from '@repo/utils';

import { SIDE_LABEL, dateParts, formatDate, formatTime } from '../_lib/format';
import { MapDialog } from './MapDialog';
import { SongHy } from './ornaments';

export function EventCard({ event }: { event: EventJson }) {
  const { weekday, day, month } = dateParts(event.startAt);

  return (
    <SpotlightCard
      theme="light"
      spotlightColor="rgba(107, 22, 34, 0.08)"
      className={`grid gap-6 rounded-3xl p-5 text-left ring-1 ring-gold/25
        sm:grid-cols-[9.5rem_1fr] sm:gap-8 sm:p-7`}
    >
      {/* Red time block, like the stamp column of a printed invitation */}
      <div
        className={`relative flex items-center justify-between gap-4
          overflow-hidden rounded-2xl bg-primary px-5 py-4
          text-primary-foreground sm:flex-col sm:justify-center sm:gap-1 sm:py-6
          sm:text-center`}
      >
        <SongHy
          className={`pointer-events-none absolute -right-3 -bottom-4 text-7xl
            text-gold-light/15`}
        />
        <span className="font-serif text-4xl leading-none tabular-nums">
          {formatTime(event.startAt)}
        </span>
        <span className="flex flex-col text-right sm:text-center">
          <span
            className={`text-[11px] font-medium tracking-[0.2em] text-gold-light
              uppercase`}
          >
            {weekday}
          </span>
          <span className="font-serif text-lg tabular-nums">
            {day}.{month}
          </span>
        </span>
      </div>

      <div className="flex flex-col">
        <span
          className={`text-xs font-semibold tracking-[0.3em] text-primary
            uppercase`}
        >
          {SIDE_LABEL[event.side]}
        </span>
        <h3
          className={`mt-2 font-serif text-2xl font-medium tracking-tight
            text-rose-deep sm:text-3xl`}
        >
          {event.name}
        </h3>
        <div className="mt-4 flex flex-1 flex-col gap-3 text-[15px]">
          <p className="flex items-start gap-3">
            <CalendarDaysIcon
              aria-hidden
              className="mt-1 size-4 shrink-0 text-gold"
            />
            <span>
              <span className="block capitalize">
                {formatDate(event.startAt)}
              </span>
              <span className="text-sm text-muted-foreground italic">
                Tức {formatLunarDate(event.startAt)}
              </span>
            </span>
          </p>
          <div className="flex items-start gap-3">
            <MapPinIcon
              aria-hidden
              className="mt-1 size-4 shrink-0 text-gold"
            />
            <div>
              <p className="font-semibold">{event.venueName}</p>
              <p className="text-muted-foreground">{event.address}</p>
            </div>
          </div>
        </div>
        {/* the address alone is enough to show the map */}
        {event.address && (
          <div className="mt-6">
            <MapDialog venue={event} title={event.name} />
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
