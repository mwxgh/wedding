'use client';

import { useState } from 'react';

import { CheckIcon, EyeOffIcon, Trash2Icon } from 'lucide-react';

import type {
  AdminAlbum,
  AdminPhoto,
  ModerationStatus,
  UpdatePhotoInput,
} from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { ExportButton } from '@repo/ui/components/export-button';
import { Input } from '@repo/ui/components/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@repo/ui/components/native-select';
import { toast } from '@repo/ui/components/sonner';

import { FormField, StatusBadge } from '../../_components/common';
import { MODERATION_LABEL } from '../../_lib/format';
import { useAdminData, useAuth } from '../_lib/auth';
import { photoSheets } from '../_lib/exports';
import { ModerationTabs } from '../_lib/moderation-tabs';
import { ErrorAlert, PageHeader } from '../_lib/ui';

export default function PhotosAdminPage() {
  const { api } = useAuth();
  const [status, setStatus] = useState<'' | ModerationStatus>('');
  const { data, error, reload } = useAdminData<AdminPhoto[]>(
    `/admin/photos${status ? `?status=${status}` : ''}`,
  );
  const { data: albums, reload: reloadAlbums } =
    useAdminData<AdminAlbum[]>('/admin/albums');
  const [albumId, setAlbumId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newAlbum, setNewAlbum] = useState('');

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        if (albumId) form.append('albumId', albumId);
        await api('/admin/photos', { body: form });
      }
      toast.success(`Đã tải lên ${files.length} ảnh`);
      await Promise.all([reload(), reloadAlbums()]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function update(id: string, body: UpdatePhotoInput) {
    await api(`/admin/photos/${id}`, { method: 'PATCH', body });
    await reload();
  }

  async function remove(id: string) {
    if (!confirm('Xoá ảnh này?')) return;
    await api(`/admin/photos/${id}`, { method: 'DELETE' });
    await Promise.all([reload(), reloadAlbums()]);
  }

  async function createAlbum() {
    if (!newAlbum.trim()) return;
    await api('/admin/albums', { body: { title: newAlbum.trim() } });
    setNewAlbum('');
    toast.success('Đã tạo album');
    await reloadAlbums();
  }

  return (
    <>
      <PageHeader
        title="Album ảnh"
        actions={
          <>
            <ModerationTabs value={status} onChange={setStatus} />
            <ExportButton
              fileName="Album anh"
              disabled={!data}
              sheets={() => photoSheets(data ?? [])}
            />
          </>
        }
      />
      <ErrorAlert error={error} />

      <Card className="mb-5">
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <FormField label="Album">
            <NativeSelect
              className="w-full"
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
            >
              <NativeSelectOption value="">
                Không thuộc album
              </NativeSelectOption>
              {albums?.map((a) => (
                <NativeSelectOption key={a.id} value={a.id}>
                  {a.title} ({a._count.photos})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Tải ảnh lên (tự động duyệt)">
            <Input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              disabled={uploading}
              onChange={(e) => upload(e.target.files)}
            />
          </FormField>
          <FormField label="Tạo album mới">
            <div className="flex gap-2">
              <Input
                value={newAlbum}
                onChange={(e) => setNewAlbum(e.target.value)}
              />
              <Button variant="outline" onClick={createAlbum}>
                Tạo
              </Button>
            </div>
          </FormField>
        </CardContent>
      </Card>

      <div
        className={'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3'}
      >
        {data?.map((p) => (
          <Card key={p.id} className="pt-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned RustFS URLs */}
            <img
              src={p.url}
              alt={p.caption ?? ''}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
            <CardContent className="flex flex-col gap-2 text-xs">
              <div>
                <StatusBadge status={p.status}>
                  {MODERATION_LABEL[p.status]}
                </StatusBadge>
              </div>
              <p className="text-muted-foreground">
                {p.invitation ? `Khách: ${p.invitation.name}` : 'Cô dâu chú rể'}
                {p.album && ` · ${p.album.title}`}
              </p>
              {p.caption && <p>{p.caption}</p>}
              <div className="flex flex-wrap gap-1">
                {p.status !== 'APPROVED' && (
                  <Button
                    size="sm"
                    onClick={() => update(p.id, { status: 'APPROVED' })}
                  >
                    <CheckIcon data-icon="inline-start" />
                    Duyệt
                  </Button>
                )}
                {p.status !== 'HIDDEN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => update(p.id, { status: 'HIDDEN' })}
                  >
                    <EyeOffIcon data-icon="inline-start" />
                    Ẩn
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="icon-sm"
                  title="Xoá"
                  onClick={() => remove(p.id)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {data && !data.length && (
        <p className="text-muted-foreground">Chưa có ảnh nào.</p>
      )}
    </>
  );
}
