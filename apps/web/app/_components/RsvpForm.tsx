'use client';

import { Fragment, useState } from 'react';

import type {
  PublicInvitation,
  RsvpRequest,
  RsvpStatus,
} from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import {
  NativeSelect,
  NativeSelectOption,
} from '@repo/ui/components/native-select';
import { Separator } from '@repo/ui/components/separator';
import { Textarea } from '@repo/ui/components/textarea';

import { clientFetch } from '../_lib/api';
import { RSVP_LABEL, formatDate, formatTime } from '../_lib/format';
import { FormAlert, FormField } from './common';

const CHOICES: RsvpStatus[] = ['ATTENDING', 'MAYBE', 'DECLINED'];

export function RsvpForm({ invitation }: { invitation: PublicInvitation }) {
  const [responses, setResponses] = useState(() =>
    invitation.events.map((e) => ({
      eventId: e.id,
      status:
        e.rsvp.status === 'PENDING'
          ? ('ATTENDING' as RsvpStatus)
          : e.rsvp.status,
      attendingCount: e.rsvp.attendingCount || invitation.maxGuests,
      message: e.rsvp.message ?? '',
    })),
  );
  const [state, setState] = useState<{
    ok?: boolean;
    error?: string;
    loading?: boolean;
  }>({});
  const answered = invitation.events.some((e) => e.rsvp.respondedAt);

  const update = (i: number, patch: Partial<(typeof responses)[number]>) =>
    setResponses((rs) =>
      rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ loading: true });
    try {
      const body: RsvpRequest = {
        responses: responses.map((r) => ({
          ...r,
          message: r.message || undefined,
        })),
      };
      await clientFetch(`/public/invitations/${invitation.code}/rsvp`, {
        body,
      });
      setState({ ok: true });
    } catch (err) {
      setState({ error: (err as Error).message });
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {state.ok && (
            <FormAlert tone="success">
              Cảm ơn bạn đã phản hồi! Bạn có thể thay đổi bất cứ lúc nào.
            </FormAlert>
          )}
          {!state.ok && answered && (
            <FormAlert tone="success">
              Bạn đã phản hồi trước đó. Có thể cập nhật lại bên dưới.
            </FormAlert>
          )}
          {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

          {invitation.events.map((event, i) => {
            const r = responses[i]!;
            return (
              <Fragment key={event.id}>
                {i > 0 && <Separator />}
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="font-semibold">{event.name}</p>
                    <p className="text-muted-foreground">
                      {formatTime(event.startAt)} · {formatDate(event.startAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CHOICES.map((c) => (
                      <Button
                        type="button"
                        key={c}
                        size="lg"
                        variant={r.status === c ? 'default' : 'outline'}
                        className="rounded-full px-4"
                        onClick={() => update(i, { status: c })}
                      >
                        {RSVP_LABEL[c]}
                      </Button>
                    ))}
                  </div>
                  {r.status !== 'DECLINED' && invitation.maxGuests > 1 && (
                    <FormField
                      label={`Số người tham dự (tối đa ${invitation.maxGuests})`}
                    >
                      <NativeSelect
                        className="w-full"
                        value={r.attendingCount}
                        onChange={(e) =>
                          update(i, { attendingCount: Number(e.target.value) })
                        }
                      >
                        {Array.from(
                          { length: invitation.maxGuests },
                          (_, n) => n + 1,
                        ).map((n) => (
                          <NativeSelectOption key={n} value={n}>
                            {n} người
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </FormField>
                  )}
                  {event.table && r.status === 'ATTENDING' && (
                    <p className="text-muted-foreground">
                      Bàn của bạn: {event.table}
                    </p>
                  )}
                </div>
              </Fragment>
            );
          })}

          <Separator />
          <FormField
            label="Nhắn gửi cô dâu chú rể (tuỳ chọn)"
            htmlFor="rsvp-note"
          >
            <Textarea
              id="rsvp-note"
              value={responses[0]?.message ?? ''}
              onChange={(e) =>
                setResponses((rs) =>
                  rs.map((r) => ({ ...r, message: e.target.value })),
                )
              }
              maxLength={1000}
            />
          </FormField>
          <Button type="submit" size="lg" disabled={state.loading}>
            {state.loading ? 'Đang gửi…' : 'Gửi phản hồi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
