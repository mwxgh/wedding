'use client';

import { useState } from 'react';

import type { PublicGuestbookEntry } from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';
import { Textarea } from '@repo/ui/components/textarea';

import { clientFetch } from '../_lib/api';
import { FormAlert, FormField } from './common';

export function Guestbook({
  entries,
  invitationCode,
  defaultName = '',
}: {
  entries: PublicGuestbookEntry[];
  invitationCode?: string;
  defaultName?: string;
}) {
  const [authorName, setAuthorName] = useState(defaultName);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<{
    ok?: string;
    error?: string;
    loading?: boolean;
  }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ loading: true });
    try {
      await clientFetch('/public/guestbook', {
        body: { authorName, message, invitationCode },
      });
      setMessage('');
      setState({
        ok: 'Cảm ơn lời chúc của bạn! Lời chúc sẽ hiển thị sau khi được duyệt.',
      });
    } catch (err) {
      setState({ error: (err as Error).message });
    }
  }

  return (
    <>
      <Card className="mx-auto max-w-2xl">
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {state.ok && <FormAlert tone="success">{state.ok}</FormAlert>}
            {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
            <FormField label="Tên của bạn" htmlFor="gb-name">
              <Input
                id="gb-name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
                maxLength={100}
              />
            </FormField>
            <FormField label="Lời chúc" htmlFor="gb-message">
              <Textarea
                id="gb-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={2000}
                className="min-h-28"
              />
            </FormField>
            <Button type="submit" size="lg" disabled={state.loading}>
              {state.loading ? 'Đang gửi…' : 'Gửi lời chúc'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <div className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent>
                <p className="whitespace-pre-line italic">“{e.message}”</p>
                <p className="mt-2.5 font-medium text-rose-deep">
                  — {e.authorName}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
