'use client';

import { useCallback, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { toast } from '@repo/ui/components/sonner';

/**
 * Runs async row actions with a per-key busy flag (blocks double clicks) and
 * a toast on success or failure, so no action can fail silently.
 */
export function useRunner() {
  const running = useRef(new Set<string>());
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());

  const run = useCallback(
    async (key: string, fn: () => Promise<unknown>, success?: string) => {
      if (running.current.has(key)) return false;
      running.current.add(key);
      setBusy(new Set(running.current));
      try {
        await fn();
        if (success) toast.success(success);
        return true;
      } catch (err) {
        toast.error((err as Error).message);
        return false;
      } finally {
        running.current.delete(key);
        setBusy(new Set(running.current));
      }
    },
    [],
  );

  const isBusy = useCallback((key: string) => busy.has(key), [busy]);
  return { run, isBusy };
}

const UNDO_MS = 5000;

/**
 * Deletes with an undo window: the row is hidden at once, and the request is
 * sent only when the toast closes without "Hoàn tác" being pressed.
 */
export function useUndoableDelete(
  remove: (id: string) => Promise<unknown>,
  onDone: () => Promise<unknown> | void,
) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const unhide = (id: string) =>
    setHidden((h) => {
      const next = new Set(h);
      next.delete(id);
      return next;
    });

  const schedule = (id: string, message: string) => {
    setHidden((h) => new Set(h).add(id));
    let settled = false;
    const commit = async () => {
      if (settled) return;
      settled = true;
      try {
        await remove(id);
        await onDone();
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        unhide(id);
      }
    };
    toast(message, {
      duration: UNDO_MS,
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          settled = true;
          unhide(id);
        },
      },
      onAutoClose: () => void commit(),
      onDismiss: () => void commit(),
    });
  };

  return { hidden, schedule };
}

/**
 * Updates several search params in one navigation (filters/tabs survive
 * refresh and can be linked). `null` or '' removes a key.
 */
export function useSetQuery() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (patch: Record<string, string | null>) => {
      const sp = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );
}

/**
 * One search param as state. Pages using it must render under a <Suspense>
 * boundary (the admin layout provides one).
 */
export function useQueryParam(key: string) {
  const value = useSearchParams().get(key);
  const setQuery = useSetQuery();
  const set = useCallback(
    (next: string | null) => setQuery({ [key]: next }),
    [key, setQuery],
  );
  return [value, set] as const;
}
