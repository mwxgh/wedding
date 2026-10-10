'use client';

import { useState } from 'react';

import { CheckIcon, EyeOffIcon, Trash2Icon } from 'lucide-react';

import type { AdminGuestbookEntry, ModerationStatus } from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { toast } from '@repo/ui/components/sonner';

import { StatusBadge } from '../../_components/common';
import { MODERATION_LABEL, formatDateTime } from '../../_lib/format';
import { useAdminData, useAuth } from '../_lib/auth';
import { ModerationTabs } from '../_lib/moderation-tabs';
import { ErrorAlert, PageHeader } from '../_lib/ui';

export default function GuestbookAdminPage() {
  const { api } = useAuth();
  const [status, setStatus] = useState<'' | ModerationStatus>('PENDING');
  const { data, error, reload } = useAdminData<AdminGuestbookEntry[]>(
    `/admin/guestbook${status ? `?status=${status}` : ''}`,
  );

  async function moderate(id: string, next: ModerationStatus) {
    await api(`/admin/guestbook/${id}`, {
      method: 'PATCH',
      body: { status: next },
    });
    toast.success(next === 'APPROVED' ? 'Đã duyệt lời chúc' : 'Đã ẩn lời chúc');
    await reload();
  }

  async function remove(id: string) {
    if (!confirm('Xoá lời chúc này?')) return;
    await api(`/admin/guestbook/${id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <>
      <PageHeader
        title="Sổ lưu bút"
        actions={<ModerationTabs value={status} onChange={setStatus} />}
      />
      <ErrorAlert error={error} />
      <div className="grid gap-3">
        {data?.map((e) => (
          <Card key={e.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {e.authorName}
                <StatusBadge status={e.status}>
                  {MODERATION_LABEL[e.status]}
                </StatusBadge>
              </CardTitle>
              <CardDescription>
                {formatDateTime(e.createdAt)}
                {e.invitation && ` · Thiệp: ${e.invitation.name}`}
              </CardDescription>
              <CardAction className="flex gap-1">
                {e.status !== 'APPROVED' && (
                  <Button size="sm" onClick={() => moderate(e.id, 'APPROVED')}>
                    <CheckIcon data-icon="inline-start" />
                    Duyệt
                  </Button>
                )}
                {e.status !== 'HIDDEN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moderate(e.id, 'HIDDEN')}
                  >
                    <EyeOffIcon data-icon="inline-start" />
                    Ẩn
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="icon-sm"
                  title="Xoá"
                  onClick={() => remove(e.id)}
                >
                  <Trash2Icon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{e.message}</p>
            </CardContent>
          </Card>
        ))}
        {data && !data.length && (
          <p className="text-muted-foreground">Không có lời chúc nào.</p>
        )}
      </div>
    </>
  );
}
