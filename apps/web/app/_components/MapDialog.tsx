'use client';

import { useState } from 'react';

import { ExternalLinkIcon, MapPinIcon, NavigationIcon } from 'lucide-react';

import { Button, buttonVariants } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Skeleton } from '@repo/ui/components/skeleton';

import { type Venue, mapLinks } from '../_lib/map';

/** "Xem bản đồ" button that opens the venue on an embedded map. */
export function MapDialog({
  venue,
  title,
  label = 'Xem bản đồ',
  size,
}: {
  venue: Venue;
  /** Dialog heading; defaults to the venue name. */
  title?: string;
  label?: string;
  size?: 'default' | 'sm';
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const links = mapLinks(venue);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        // phones: 44px tap target (compact `sm` stays as is)
        className={size === 'sm' ? undefined : 'max-sm:h-11'}
        onClick={() => {
          setLoaded(false);
          setOpen(true);
        }}
      >
        <MapPinIcon data-icon="inline-start" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {title ?? venue.venueName}
            </DialogTitle>
            <DialogDescription>
              {title ? `${venue.venueName} · ` : ''}
              {venue.address}
            </DialogDescription>
          </DialogHeader>
          <div
            className={`relative aspect-4/3 overflow-hidden rounded-xl border
              sm:aspect-video`}
          >
            {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
            {open && (
              <iframe
                title={`Bản đồ: ${venue.venueName}`}
                src={links.embed}
                className="absolute inset-0 size-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setLoaded(true)}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <a
              className={buttonVariants({
                variant: 'outline',
                className: 'max-sm:h-11',
              })}
              href={links.open}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLinkIcon data-icon="inline-start" />
              Mở Google Maps
            </a>
            <a
              className={buttonVariants({ className: 'max-sm:h-11' })}
              href={links.directions}
              target="_blank"
              rel="noreferrer"
            >
              <NavigationIcon data-icon="inline-start" />
              Chỉ đường
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
