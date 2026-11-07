'use client';

import {
  CheckIcon,
  EyeOffIcon,
  MessageSquareHeartIcon,
  QuoteIcon,
  Trash2Icon,
} from 'lucide-react';

import type { AdminGuestbookEntry, ModerationStatus } from '@repo/types';
import { Avatar, AvatarFallback } from '@repo/ui/components/avatar';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Empty } from '@repo/ui/components/empty';
import { ExportButton } from '@repo/ui/components/export-button';

import { StatusBadge } from '../../_components/common';
import { MODERATION_LABEL, formatDateTime } from '../../_lib/format';
import { useQueryParam, useRunner, useUndoableDelete } from '../_lib/actions';
import { useAdminData, useAuth } from '../_lib/auth';
import { guestbookSheets } from '../_lib/exports';
import { ModerationTabs } from '../_lib/moderation-tabs';
import { ErrorAlert, ListSkeleton, PageHeader } from '../_lib/ui';

export default function GuestbookAdminPage() {
  const { api } = useAuth();
  // default tab is "Chờ duyệt"; "Tất cả" is stored as ?status=ALL
  const [param, setParam] = useQueryParam('status');
  const status = (param === 'ALL' ? '' : (param ?? 'PENDING')) as
    '' | ModerationStatus;
  const { data, error, reload } = useAdminData<AdminGuestbookEntry[]>(
    `/admin/guestbook${status ? `?status=${status}` : ''}`,
  );
  const { run, isBusy } = useRunner();
  const { hidden, schedule } = useUndoableDelete(
    (id) => api(`/admin/guestbook/${id}`, { method: 'DELETE' }),
    reload,
  );
  const entries = data?.filter((e) => !hidden.has(e.id));

  const moderate = (id: string, next: ModerationStatus) =>
    run(
      id,
      async () => {
        await api(`/admin/guestbook/${id}`, {
          method: 'PATCH',
          body: { status: next },
        });
        await reload();
      },
      next === 'APPROVED' ? 'Đã duyệt lời chúc' : 'Đã ẩn lời chúc',
    );

  return (
    <>
      <PageHeader
        title="Sổ lưu bút"
        actions={
          <>
            <ModerationTabs
              value={status}
              onChange={(v) => setParam(v || 'ALL')}
            />
            <ExportButton
              fileName="So luu but"
              disabled={!data}
              sheets={() => guestbookSheets(entries ?? [])}
            />
          </>
        }
      />
      <ErrorAlert error={error} onRetry={reload} />
      {!data && !error && <ListSkeleton />}
      <div className="grid gap-4">
        {entries?.map((e) => (
          <Card key={e.id} className="transition-shadow hover:shadow-lift">
            <CardHeader className="gap-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 shrink-0">
                  <AvatarFallback
                    className={`bg-secondary font-serif text-base
                    text-secondary-foreground`}
                  >
                    {e.authorName.trim().charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-1">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span className="truncate">{e.authorName}</span>
                    <StatusBadge status={e.status}>
                      {MODERATION_LABEL[e.status]}
                    </StatusBadge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {formatDateTime(e.createdAt)}
                    {e.invitation && ` · Thiệp: ${e.invitation.name}`}
                  </CardDescription>
                </div>
              </div>
              <CardAction className="flex gap-1.5">
                {e.status !== 'APPROVED' && (
                  <Button
                    size="sm"
                    className="max-sm:h-11"
                    disabled={isBusy(e.id)}
                    onClick={() => moderate(e.id, 'APPROVED')}
                  >
                    <CheckIcon data-icon="inline-start" aria-hidden />
                    Duyệt
                  </Button>
                )}
                {e.status !== 'HIDDEN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-sm:h-11"
                    disabled={isBusy(e.id)}
                    onClick={() => moderate(e.id, 'HIDDEN')}
                  >
                    <EyeOffIcon data-icon="inline-start" aria-hidden />
                    Ẩn
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="icon-sm"
                  className="max-sm:size-11"
                  title="Xoá"
                  aria-label={`Xoá lời chúc của ${e.authorName}`}
                  disabled={isBusy(e.id)}
                  onClick={() =>
                    schedule(e.id, `Đã xoá lời chúc của ${e.authorName}`)
                  }
                >
                  <Trash2Icon aria-hidden />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <blockquote
                className={`relative rounded-xl bg-muted/50 py-3 pr-4 pl-10
                leading-relaxed whitespace-pre-line text-foreground/90`}
              >
                <QuoteIcon
                  aria-hidden
                  className="absolute top-3 left-3 size-4 text-gold"
                />
                {e.message}
              </blockquote>
            </CardContent>
          </Card>
        ))}
        {entries && !entries.length && (
          <Empty
            icon={<MessageSquareHeartIcon />}
            title={
              status === 'PENDING'
                ? 'Không có lời chúc nào chờ duyệt'
                : 'Không có lời chúc nào'
            }
            description="Lời chúc mới của khách sẽ xuất hiện ở đây."
          />
        )}
      </div>
    </>
  );
}
