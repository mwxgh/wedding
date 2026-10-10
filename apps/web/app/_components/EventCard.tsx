'use client';

import { MapPinIcon } from 'lucide-react';

import type { EventJson } from '@repo/contracts';
import { buttonVariants } from '@repo/ui/components/button';
import SpotlightCard from '@repo/ui/components/reactbits/spotlight-card';

import { SIDE_LABEL, formatDate, formatTime } from '../_lib/format';
import { StatusBadge } from './common';

export function EventCard({ event }: { event: EventJson }) {
  return (
    <SpotlightCard
      theme="light"
      spotlightColor="rgba(181, 131, 141, 0.25)"
      className="rounded-2xl p-6 text-left"
    >
      <StatusBadge>{SIDE_LABEL[event.side]}</StatusBadge>
      <h3 className="mt-2.5 mb-2 font-serif text-2xl text-rose-deep">
        {event.name}
      </h3>
      <div className="font-serif text-3xl text-gold">
        {formatTime(event.startAt)}
      </div>
      <div className="mt-3 mb-4 space-y-1">
        <p className="capitalize">{formatDate(event.startAt)}</p>
        <p className="font-semibold">{event.venueName}</p>
        <p className="text-muted-foreground">{event.address}</p>
      </div>
      {event.mapUrl && (
        <a
          className={buttonVariants({ variant: 'outline' })}
          href={event.mapUrl}
          target="_blank"
          rel="noreferrer"
        >
          <MapPinIcon data-icon="inline-start" />
          Xem bản đồ
        </a>
      )}
    </SpotlightCard>
  );
}
