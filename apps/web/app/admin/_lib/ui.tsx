'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Loader2Icon, RotateCwIcon } from 'lucide-react';

import { Button } from '@repo/ui/components/button';
import { useConfirm } from '@repo/ui/components/confirm-dialog';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Skeleton } from '@repo/ui/components/skeleton';

import { FormAlert } from '../../_components/common';

export function PageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className={`mb-6 flex flex-wrap items-end justify-between gap-4 border-b
        pb-5 md:mb-8`}
    >
      <h1
        className={`font-serif text-3xl font-semibold tracking-tight
          md:text-4xl`}
      >
        {title}
      </h1>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function ErrorAlert({
  error,
  onRetry,
}: {
  error: string | null | undefined;
  /** Shows a "Thử lại" button, e.g. the `reload` of `useAdminData`. */
  onRetry?: () => void;
}) {
  if (!error) return null;
  return (
    <div className="mb-4 flex flex-col gap-2">
      <FormAlert tone="error">{error}</FormAlert>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="self-start max-sm:h-11"
          onClick={onRetry}
        >
          <RotateCwIcon data-icon="inline-start" aria-hidden />
          Thử lại
        </Button>
      )}
    </div>
  );
}

/** Placeholder rows while a list loads. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3" role="status" aria-busy aria-label="Đang tải…">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}

/**
 * Dialog wrapping a form with Cancel / Save actions.
 * Header and footer stay pinned while the fields scroll; the submit button
 * shows a pending state while an async `onSubmit` runs, and errors are
 * scrolled into view when they appear. Pass the form state as `value` to
 * ask before closing (Esc, backdrop, Huỷ) with unsaved changes.
 */
export function FormDialog({
  open,
  title,
  description,
  error,
  submitLabel = 'Lưu',
  onClose,
  onSubmit,
  value,
  children,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  error?: string | null;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  /** Current form state; compared with its value when the dialog opened. */
  value?: unknown;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();
  const initial = useRef<string | null>(null);
  const current = JSON.stringify(value ?? null);

  useEffect(() => {
    initial.current = open ? (initial.current ?? current) : null;
  }, [open, current]);

  async function requestClose() {
    if (pending) return;
    const dirty = initial.current !== null && initial.current !== current;
    if (
      dirty &&
      !(await confirm({
        title: 'Bỏ các thay đổi chưa lưu?',
        description: 'Những gì bạn vừa nhập sẽ không được lưu.',
        confirmLabel: 'Bỏ thay đổi',
        cancelLabel: 'Tiếp tục sửa',
      }))
    )
      return;
    onClose();
  }

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    if (pending) {
      e.preventDefault();
      return;
    }
    setPending(true);
    try {
      await onSubmit(e);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && void requestClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          aria-busy={pending}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <DialogBody>
            <div ref={errorRef} className="empty:hidden">
              <ErrorAlert error={error} />
            </div>
            {children}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="max-sm:h-11"
              onClick={() => void requestClose()}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              size="lg"
              className="max-sm:h-11"
              disabled={pending}
            >
              {pending && (
                <Loader2Icon
                  data-icon="inline-start"
                  aria-hidden
                  className="animate-spin motion-reduce:animate-none"
                />
              )}
              {pending ? 'Đang lưu…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
