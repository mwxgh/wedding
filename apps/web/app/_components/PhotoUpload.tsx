'use client';

import { useState } from 'react';

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

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!files.length) return;
    const form = e.currentTarget;
    setState({ loading: true });
    try {
      for (const file of files) {
        const body = new FormData();
        body.append('file', file);
        body.append('invitationCode', invitationCode);
        if (caption) body.append('caption', caption);
        await clientFetch('/public/photos', { body });
      }
      setState({
        ok: `Đã gửi ${files.length} ảnh. Ảnh sẽ hiển thị sau khi được duyệt.`,
      });
      setFiles([]);
      setCaption('');
      form.reset();
    } catch (err) {
      setState({ error: (err as Error).message });
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {state.ok && <FormAlert tone="success">{state.ok}</FormAlert>}
          {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
          <FormField
            label="Chọn ảnh (JPG, PNG, WEBP, HEIC)"
            htmlFor="photo-files"
          >
            <Input
              id="photo-files"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
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
          <Button
            type="submit"
            size="lg"
            disabled={state.loading || !files.length}
          >
            {state.loading ? 'Đang tải lên…' : 'Gửi ảnh'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
