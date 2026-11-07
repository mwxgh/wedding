'use client';

import { useState } from 'react';

import {
  CheckIcon,
  EyeOffIcon,
  FolderPlusIcon,
  ImagePlusIcon,
  ImagesIcon,
  Loader2Icon,
  Trash2Icon,
} from 'lucide-react';

import type {
  AdminAlbum,
  AdminPhoto,
  ModerationStatus,
  UpdatePhotoInput,
} from '@repo/types';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { Empty } from '@repo/ui/components/empty';
import { ExportButton } from '@repo/ui/components/export-button';
import { Input } from '@repo/ui/components/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@repo/ui/components/native-select';
import { toast } from '@repo/ui/components/sonner';

import { FormField, StatusBadge } from '../../_components/common';
import { MODERATION_LABEL } from '../../_lib/format';
import { useQueryParam, useRunner, useUndoableDelete } from '../_lib/actions';
import { useAdminData, useAuth } from '../_lib/auth';
import { photoSheets } from '../_lib/exports';
import { ModerationTabs } from '../_lib/moderation-tabs';
import { ErrorAlert, ListSkeleton, PageHeader } from '../_lib/ui';

export default function PhotosAdminPage() {
  const { api } = useAuth();
  const [param, setParam] = useQueryParam('status');
  const status = (param ?? '') as '' | ModerationStatus;
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

  const { run, isBusy } = useRunner();
  const { hidden, schedule } = useUndoableDelete(
    (id) => api(`/admin/photos/${id}`, { method: 'DELETE' }),
    () => Promise.all([reload(), reloadAlbums()]),
  );
  const photos = data?.filter((p) => !hidden.has(p.id));

  const update = (id: string, body: UpdatePhotoInput) =>
    run(
      id,
      async () => {
        await api(`/admin/photos/${id}`, { method: 'PATCH', body });
        await reload();
      },
      body.status === 'APPROVED' ? 'Đã duyệt ảnh' : 'Đã ẩn ảnh',
    );

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    const title = newAlbum.trim();
    if (!title) return;
    await run(
      'album',
      async () => {
        await api('/admin/albums', { body: { title } });
        setNewAlbum('');
        await reloadAlbums();
      },
      'Đã tạo album',
    );
  }

  const photoName = (p: AdminPhoto) =>
    p.caption ||
    (p.invitation ? `ảnh của ${p.invitation.name}` : 'ảnh của cô dâu chú rể');

  return (
    <>
      <PageHeader
        title="Album ảnh"
        actions={
          <>
            <ModerationTabs
              value={status}
              onChange={(v) => setParam(v || null)}
            />
            <ExportButton
              fileName="Album anh"
              disabled={!data}
              sheets={() => photoSheets(photos ?? [])}
            />
          </>
        }
      />
      <ErrorAlert error={error} onRetry={reload} />

      <Card className="mb-6">
        <CardContent
          className={'grid gap-5 sm:grid-cols-[1fr_1.4fr_1fr] sm:items-end'}
        >
          <FormField label="Album" htmlFor="upload-album">
            <NativeSelect
              id="upload-album"
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
          <FormField label="Tải ảnh lên (tự động duyệt)" htmlFor="upload-files">
            <div
              className={`relative flex items-center gap-3 rounded-xl border
                border-dashed border-primary/40 bg-secondary/40 px-3 py-1.5
                transition-colors focus-within:border-primary
                focus-within:ring-3 focus-within:ring-ring/30
                hover:bg-secondary/70`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg
                  bg-card text-primary shadow-xs`}
              >
                {uploading ? (
                  <Loader2Icon
                    aria-hidden
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <ImagePlusIcon aria-hidden className="size-4" />
                )}
              </span>
              <Input
                id="upload-files"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                disabled={uploading}
                onChange={(e) => upload(e.target.files)}
                className={`h-auto border-0 bg-transparent px-0 shadow-none
                  file:mr-3 file:rounded-md file:bg-primary file:px-2.5
                  file:text-primary-foreground focus-visible:ring-0`}
              />
            </div>
          </FormField>
          <FormField label="Tạo album mới" htmlFor="new-album">
            <form onSubmit={createAlbum} className="flex gap-2">
              <Input
                id="new-album"
                value={newAlbum}
                placeholder="Tên album"
                onChange={(e) => setNewAlbum(e.target.value)}
              />
              <Button
                type="submit"
                variant="outline"
                className="h-10"
                disabled={isBusy('album') || !newAlbum.trim()}
              >
                <FolderPlusIcon data-icon="inline-start" aria-hidden />
                Tạo
              </Button>
            </form>
          </FormField>
        </CardContent>
      </Card>

      {!data && !error && <ListSkeleton />}
      <div
        className={'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4'}
      >
        {photos?.map((p) => (
          <Card
            key={p.id}
            className={`group/photo gap-3 pt-0 transition-shadow
            hover:shadow-lift`}
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- presigned RustFS URLs */}
              <img
                src={p.url}
                alt={photoName(p)}
                loading="lazy"
                className={`size-full object-cover transition-transform
                duration-300 group-hover/photo:scale-[1.03]
                motion-reduce:transition-none`}
              />
              <div className="absolute top-2 left-2 shadow-sm">
                <StatusBadge status={p.status}>
                  {MODERATION_LABEL[p.status]}
                </StatusBadge>
              </div>
            </div>
            <CardContent className="flex flex-1 flex-col gap-2 text-xs">
              <p className="text-muted-foreground">
                {p.invitation ? `Khách: ${p.invitation.name}` : 'Cô dâu chú rể'}
                {p.album && ` · ${p.album.title}`}
              </p>
              {p.caption && (
                <p className="line-clamp-2 text-sm text-foreground">
                  {p.caption}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {p.status !== 'APPROVED' && (
                  <Button
                    size="sm"
                    className="max-sm:h-11"
                    disabled={isBusy(p.id)}
                    onClick={() => update(p.id, { status: 'APPROVED' })}
                  >
                    <CheckIcon data-icon="inline-start" aria-hidden />
                    Duyệt
                  </Button>
                )}
                {p.status !== 'HIDDEN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-sm:h-11"
                    disabled={isBusy(p.id)}
                    onClick={() => update(p.id, { status: 'HIDDEN' })}
                  >
                    <EyeOffIcon data-icon="inline-start" aria-hidden />
                    Ẩn
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="icon-sm"
                  className="ml-auto max-sm:size-11"
                  title="Xoá"
                  aria-label={`Xoá ${photoName(p)}`}
                  disabled={isBusy(p.id)}
                  onClick={() => schedule(p.id, 'Đã xoá ảnh')}
                >
                  <Trash2Icon aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {photos && !photos.length && (
        <Empty
          icon={<ImagesIcon />}
          title={status ? 'Không có ảnh nào ở mục này' : 'Chưa có ảnh nào'}
          description="Tải ảnh lên ở trên hoặc chờ khách chia sẻ khoảnh khắc."
        />
      )}
    </>
  );
}
