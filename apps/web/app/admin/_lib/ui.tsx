'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Loader2Icon } from 'lucide-react';

import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';

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

export function ErrorAlert({ error }: { error: string | null | undefined }) {
  return error ? <FormAlert tone="error">{error}</FormAlert> : null;
}

/**
 * Dialog wrapping a form with Cancel / Save actions.
 * Header and footer stay pinned while the fields scroll; the submit button
 * shows a pending state while an async `onSubmit` runs, and errors are
 * scrolled into view when they appear.
 */
export function FormDialog({
  open,
  title,
  description,
  error,
  submitLabel = 'Lưu',
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  error?: string | null;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

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
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
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
              onClick={onClose}
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
