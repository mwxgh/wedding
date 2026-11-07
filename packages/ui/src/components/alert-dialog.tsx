'use client';

import * as React from 'react';

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { cn } from 'cn';

function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogContent({
  className,
  children,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        data-slot="alert-dialog-overlay"
        className={`fixed inset-0 isolate z-50 bg-black/50 duration-200
          supports-backdrop-filter:backdrop-blur-sm motion-reduce:animate-none
          data-open:animate-in data-open:fade-in-0 data-closed:animate-out
          data-closed:duration-150 data-closed:fade-out-0`}
      />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          `fixed z-50 flex flex-col gap-5 bg-popover text-sm
          text-popover-foreground shadow-2xl ring-1 ring-foreground/10
          duration-200 ease-out outline-none motion-reduce:animate-none
          data-open:animate-in data-open:fade-in-0 data-closed:animate-out
          data-closed:duration-150 data-closed:fade-out-0`,
          `inset-x-0 bottom-0 rounded-t-2xl p-5
          pb-[max(1.25rem,env(safe-area-inset-bottom))]
          data-open:slide-in-from-bottom-8 data-closed:slide-out-to-bottom-8`,
          `sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full
          sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl
          sm:p-6 sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95
          sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95`,
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        'text-lg leading-tight font-semibold tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function AlertDialogClose({ ...props }: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close data-slot="alert-dialog-close" {...props} />
  );
}

export {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
};
