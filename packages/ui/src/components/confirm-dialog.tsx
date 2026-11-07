'use client';

import * as React from 'react';

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#components/alert-dialog';
import { Button } from '#components/button';

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (default true). */
  destructive?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<Confirm | null>(null);

/**
 * Promise-based replacement for `window.confirm`, rendered as an accessible
 * alert dialog: `if (!(await confirm({ title: 'Xoá?' }))) return;`
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);
  const [open, setOpen] = React.useState(false);

  const confirm = React.useCallback<Confirm>(
    (options) =>
      new Promise((resolve) => {
        setState({ ...options, resolve });
        setOpen(true);
      }),
    [],
  );

  const settle = (ok: boolean) => {
    state?.resolve(ok);
    setOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) settle(false);
        }}
      >
        {state && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-xl">
                {state.title}
              </AlertDialogTitle>
              {state.description && (
                <AlertDialogDescription>
                  {state.description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose
                render={
                  <Button variant="outline" size="lg" className="max-sm:h-11" />
                }
              >
                {state.cancelLabel ?? 'Huỷ'}
              </AlertDialogClose>
              <Button
                size="lg"
                className="max-sm:h-11"
                variant={
                  state.destructive === false ? 'default' : 'destructive'
                }
                onClick={() => settle(true)}
              >
                {state.confirmLabel ?? 'Xoá'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
