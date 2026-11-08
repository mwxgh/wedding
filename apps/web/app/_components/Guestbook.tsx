'use client';

import { useRef, useState } from 'react';

import { SendIcon } from 'lucide-react';

import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';
import { Textarea } from '@repo/ui/components/textarea';

import { clientFetch } from '../_lib/api';
import { FormAlert, FormField } from './common';

export function Guestbook({
  invitationCode,
  defaultName = '',
}: {
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
  const statusRef = useRef<HTMLDivElement>(null);

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
    requestAnimationFrame(() =>
      statusRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      }),
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="sm:px-8 sm:py-2">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormField label="Tên của bạn" htmlFor="gb-name">
            <Input
              id="gb-name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
              maxLength={100}
              autoComplete="name"
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
          <div
            ref={statusRef}
            className="flex scroll-mb-24 flex-col gap-3 empty:hidden"
          >
            {state.ok && <FormAlert tone="success">{state.ok}</FormAlert>}
            {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={state.loading}
            className="mt-1 max-sm:h-11 sm:self-end"
          >
            <SendIcon data-icon="inline-start" aria-hidden />
            {state.loading ? 'Đang gửi…' : 'Gửi lời chúc'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
