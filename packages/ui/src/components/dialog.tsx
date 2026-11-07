'use client';

import * as React from 'react';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';
import { XIcon } from 'lucide-react';

import { Button } from '#components/button';

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        `fixed inset-0 isolate z-50 bg-black/50 duration-200
        supports-backdrop-filter:backdrop-blur-sm motion-reduce:animate-none
        data-open:animate-in data-open:fade-in-0 data-closed:animate-out
        data-closed:duration-150 data-closed:fade-out-0`,
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = 'Đóng',
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  /** Accessible name of the corner close button. */
  closeLabel?: string;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          `fixed z-50 flex flex-col gap-5 bg-popover text-sm
          text-popover-foreground shadow-2xl ring-1 ring-foreground/10
          duration-200 ease-out outline-none motion-reduce:animate-none
          data-open:animate-in data-open:fade-in-0 data-closed:animate-out
          data-closed:duration-150 data-closed:ease-in data-closed:fade-out-0`,
          // Mobile: bottom sheet, clear of the home indicator.
          `inset-x-0 bottom-0 max-h-[calc(100dvh-1.5rem)] rounded-t-2xl p-5
          pb-[max(1.25rem,env(safe-area-inset-bottom))]
          data-open:slide-in-from-bottom-8 data-closed:slide-out-to-bottom-8`,
          // Desktop: centered card.
          `sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2
          sm:max-h-[calc(100dvh-4rem)] sm:w-full sm:max-w-md sm:-translate-x-1/2
          sm:-translate-y-1/2 sm:rounded-2xl sm:p-6
          sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95
          sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95`,
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className={`absolute top-3 right-3 rounded-full
                text-muted-foreground hover:text-foreground max-sm:size-11
                sm:top-4 sm:right-4`}
                size="icon"
              />
            }
          >
            <XIcon aria-hidden />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex shrink-0 flex-col gap-1.5 pr-10', className)}
      {...props}
    />
  );
}

/** Scrollable middle region; header and footer stay pinned. */
function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        `-mx-5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto
        overscroll-contain px-5 py-1 sm:-mx-6 sm:px-6`,
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        `-mx-5 flex shrink-0 flex-col-reverse gap-2 border-t px-5 pt-4 sm:-mx-6
        sm:flex-row sm:justify-end sm:px-6`,
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Đóng
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        'text-lg leading-tight font-semibold tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        `text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3
        *:[a]:hover:text-foreground`,
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
