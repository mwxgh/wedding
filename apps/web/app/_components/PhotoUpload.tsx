'use client';

import { useRef, useState } from 'react';

import { ImageUpIcon } from 'lucide-react';

import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';

import { clientFetch } from '../_lib/api';
import { FormAlert, FormField } from './common';

export function PhotoUpload({ invitationCode }: { invitationCode: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [state, setState] = useState<{
    ok?: string;
    error?: string;
    loading?: boolean;
  }>({});
  // photos already uploaded in the current batch (for progress)
  const [done, setDone] = useState(0);
  const statusRef = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!files.length) return;
    const form = e.currentTarget;
    setState({ loading: true });
    setDone(0);
    let sent = 0;
    try {
      for (const file of files) {
        const body = new FormData();
        body.append('file', file);
        body.append('invitationCode', invitationCode);
        if (caption) body.append('caption', caption);
        await clientFetch('/public/photos', { body });
        sent += 1;
        setDone(sent);
      }
      setState({
        ok: `Đã gửi ${files.length} ảnh. Ảnh sẽ hiển thị sau khi được duyệt.`,
      });
      setFiles([]);
      setCaption('');
      form.reset();
    } catch (err) {
      // keep only the photos that did not go through, so a retry won't
      // send the others twice
      setFiles((f) => f.slice(sent));
      setState({
        error: sent
          ? `Đã gửi ${sent}/${files.length} ảnh. ${(err as Error).message}. Bấm gửi lại để thử tiếp ${files.length - sent} ảnh còn lại.`
          : (err as Error).message,
      });
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
          <FormField
            label="Chọn ảnh (JPG, PNG, WEBP, HEIC)"
            htmlFor="photo-files"
          >
            <Input
              id="photo-files"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              className={`h-auto cursor-pointer border-dashed bg-muted/40 py-6
                text-center file:mr-3 file:h-9 file:rounded-full file:bg-primary
                file:px-4 file:text-primary-foreground hover:border-primary/50`}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </FormField>
          <FormField label="Chú thích (tuỳ chọn)" htmlFor="photo-caption">
            <Input
              id="photo-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={255}
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
            disabled={state.loading || !files.length}
            className="max-sm:h-11"
          >
            <ImageUpIcon data-icon="inline-start" aria-hidden />
            {state.loading
              ? `Đang tải lên ${Math.min(done + 1, files.length)}/${files.length}…`
              : files.length > 1
                ? `Gửi ${files.length} ảnh`
                : 'Gửi ảnh'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
