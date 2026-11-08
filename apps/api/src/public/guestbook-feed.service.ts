import { Injectable, type MessageEvent } from '@nestjs/common';

import { type Observable, Subject, interval, map, merge } from 'rxjs';

import type { PublicGuestbookEntryData } from '../common/responses';

/**
 * In-process fan-out of newly approved guestbook entries to SSE clients.
 * Fine for the single api instance we run; several instances would need a
 * shared bus (e.g. Redis pub/sub) instead.
 */
@Injectable()
export class GuestbookFeed {
  private readonly approved = new Subject<PublicGuestbookEntryData>();

  publish(entry: PublicGuestbookEntryData) {
    this.approved.next(entry);
  }

  /** `wish` events, plus a `ping` every 25 s so proxies keep the stream open. */
  stream(): Observable<MessageEvent> {
    return merge(
      this.approved.pipe(map((data) => ({ type: 'wish', data }))),
      interval(25_000).pipe(map(() => ({ type: 'ping', data: '' }))),
    );
  }
}
