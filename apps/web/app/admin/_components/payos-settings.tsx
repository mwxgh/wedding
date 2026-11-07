'use client';

import { useEffect, useState } from 'react';

import {
  CheckCircle2Icon,
  CircleDashedIcon,
  KeyRoundIcon,
  Loader2Icon,
  Trash2Icon,
  WebhookIcon,
} from 'lucide-react';

import type { PayosChannel, PayosConfigInput, Side } from '@repo/types';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { useConfirm } from '@repo/ui/components/confirm-dialog';
import { Input } from '@repo/ui/components/input';
import { toast } from '@repo/ui/components/sonner';
import { Switch } from '@repo/ui/components/switch';

import { FormField } from '../../_components/common';
import { PUBLIC_API_URL } from '../../_lib/api';
import { SIDE_LABEL, formatDateTime } from '../../_lib/format';
import { useAdminData, useAuth } from '../_lib/auth';

type Draft = Required<PayosConfigInput>;

const draftOf = (c: PayosChannel): Draft => ({
  clientId: c.clientId ?? '',
  apiKey: '',
  checksumKey: '',
  enabled: c.configured ? c.enabled : true,
});

/**
 * payOS keys per family, saved encrypted in the database. Keys are never
 * shown again: blank fields keep what is stored.
 */
export function PayosSettings() {
  const { data: channels, reload } = useAdminData<PayosChannel[]>(
    '/admin/payos/channels',
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 font-serif text-xl">
          <span
            className={`grid size-9 place-items-center rounded-xl bg-secondary
              text-primary`}
          >
            <KeyRoundIcon aria-hidden className="size-5" />
          </span>
          Thanh toán payOS
        </CardTitle>
        <CardDescription className="max-w-prose">
          Mỗi bên một kênh payOS (một tài khoản ngân hàng nhận tiền mừng). Lấy
          Client ID, API key và Checksum key ở my.payos.vn → Kênh thanh toán.
          Key được mã hoá trước khi lưu và không hiển thị lại.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {channels?.map((c) => (
          <ChannelForm key={c.side} channel={c} onSaved={reload} />
        ))}
      </CardContent>
    </Card>
  );
}

function ChannelForm({
  channel: c,
  onSaved,
}: {
  channel: PayosChannel;
  onSaved: () => Promise<void>;
}) {
  const { api } = useAuth();
  const [draft, setDraft] = useState<Draft>(() => draftOf(c));
  const [webhook, setWebhook] = useState(`${PUBLIC_API_URL}${c.webhookPath}`);
  const [busy, setBusy] = useState<'save' | 'webhook' | 'remove' | null>(null);
  const confirm = useConfirm();

  useEffect(() => setDraft(draftOf(c)), [c]);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy('save');
    try {
      const body: PayosConfigInput = {
        clientId: draft.clientId,
        enabled: draft.enabled,
        apiKey: draft.apiKey || undefined,
        checksumKey: draft.checksumKey || undefined,
      };
      await api(`/admin/payos/${c.side}`, { method: 'PUT', body });
      toast.success(`Đã lưu payOS cho ${SIDE_LABEL[c.side]}`);
      await onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (
      !(await confirm({
        title: `Xoá cấu hình payOS của ${SIDE_LABEL[c.side]}?`,
        description:
          'Khách sẽ không mừng online qua kênh này được nữa cho tới khi bạn nhập lại key.',
      }))
    )
      return;
    setBusy('remove');
    try {
      await api(`/admin/payos/${c.side}`, { method: 'DELETE' });
      toast.success('Đã xoá cấu hình');
      await onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function confirmWebhook(side: Side) {
    setBusy('webhook');
    try {
      await api(`/admin/payos/${side}/webhook`, {
        method: 'POST',
        body: { url: webhook },
      });
      toast.success(`payOS đã xác nhận webhook cho ${SIDE_LABEL[side]}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const keyPlaceholder = (hint: string | null) =>
    hint ? `Đã lưu ${hint} — để trống để giữ nguyên` : 'Bắt buộc';

  return (
    <form
      onSubmit={save}
      className={`grid content-start gap-4 rounded-2xl border bg-muted/30 p-4
        sm:p-5`}
    >
      <div className="flex items-center justify-between gap-2">
        <strong className="font-serif text-lg font-medium">
          {SIDE_LABEL[c.side]}
        </strong>
        {c.configured ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5
              py-1 text-xs font-medium ${
                c.enabled
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
          >
            <CheckCircle2Icon aria-hidden className="size-3.5" />
            {c.enabled ? 'Đang nhận mừng' : 'Đã tắt'}
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border
              border-dashed px-2.5 py-1 text-xs font-medium
              text-muted-foreground`}
          >
            <CircleDashedIcon aria-hidden className="size-3.5" /> Chưa cấu hình
          </span>
        )}
      </div>

      <FormField label="Client ID">
        <Input
          value={draft.clientId}
          onChange={(e) => set({ clientId: e.target.value })}
          required
          autoComplete="off"
        />
      </FormField>
      <FormField label="API key">
        <Input
          type="password"
          value={draft.apiKey}
          onChange={(e) => set({ apiKey: e.target.value })}
          placeholder={keyPlaceholder(c.apiKeyHint)}
          required={!c.configured}
          autoComplete="new-password"
        />
      </FormField>
      <FormField label="Checksum key">
        <Input
          type="password"
          value={draft.checksumKey}
          onChange={(e) => set({ checksumKey: e.target.value })}
          placeholder={keyPlaceholder(c.checksumKeyHint)}
          required={!c.configured}
          autoComplete="new-password"
        />
      </FormField>
      {c.configured && (!c.apiKeyHint || !c.checksumKeyHint) && (
        <p
          role="alert"
          className={`rounded-xl bg-destructive/10 px-3 py-2 text-sm
          text-destructive`}
        >
          Không giải mã được key đã lưu (SETTINGS_SECRET đã đổi?). Hãy nhập lại
          cả hai key.
        </p>
      )}

      <label
        className={`flex cursor-pointer items-center gap-3 rounded-xl border
          bg-card px-3 py-2.5 text-sm`}
      >
        <Switch
          checked={draft.enabled}
          onCheckedChange={(enabled) => set({ enabled })}
        />
        Hiện hộp mừng cho {SIDE_LABEL[c.side].toLowerCase()} trên trang thiệp
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {c.updatedAt && (
          <span className="text-xs text-muted-foreground">
            Cập nhật {formatDateTime(c.updatedAt)}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {c.configured && (
            <Button
              type="button"
              variant="destructive"
              className="max-sm:h-11"
              disabled={busy === 'remove'}
              onClick={remove}
            >
              <Trash2Icon data-icon="inline-start" aria-hidden />
              Xoá
            </Button>
          )}
          <Button
            type="submit"
            className="max-sm:h-11"
            disabled={busy === 'save'}
          >
            {busy === 'save' && (
              <Loader2Icon
                data-icon="inline-start"
                aria-hidden
                className="animate-spin motion-reduce:animate-none"
              />
            )}
            Lưu
          </Button>
        </div>
      </div>

      {c.configured && (
        <FormField
          label="Webhook URL (phải truy cập được từ internet)"
          htmlFor={`payos-webhook-${c.side}`}
        >
          <div className="flex gap-2">
            <Input
              id={`payos-webhook-${c.side}`}
              className="min-w-0 flex-1"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={busy === 'webhook'}
              onClick={() => confirmWebhook(c.side)}
            >
              {busy === 'webhook' ? (
                <Loader2Icon
                  data-icon="inline-start"
                  aria-hidden
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <WebhookIcon data-icon="inline-start" aria-hidden />
              )}
              Đăng ký
            </Button>
          </div>
        </FormField>
      )}
    </form>
  );
}
