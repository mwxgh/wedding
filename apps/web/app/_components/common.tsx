import type { ComponentProps, ReactNode } from 'react';

import { Alert, AlertDescription } from '@repo/ui/components/alert';
import { Badge } from '@repo/ui/components/badge';
import { Field, FieldLabel } from '@repo/ui/components/field';
import { cn } from '@repo/ui/lib/utils';

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('mx-auto w-full max-w-5xl px-4', className)}
      {...props}
    />
  );
}

export function Section({
  alt,
  id,
  children,
}: {
  alt?: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn('py-18', alt && 'bg-muted')}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionTitle({
  script,
  title,
}: {
  script: string;
  title: string;
}) {
  return (
    <div className="mb-10 text-center">
      <span className="block font-script text-2xl text-primary">{script}</span>
      <h2 className="font-serif text-3xl font-medium sm:text-4xl">{title}</h2>
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  ATTENDING: 'bg-green-50 text-green-700',
  APPROVED: 'bg-green-50 text-green-700',
  DECLINED: 'bg-red-50 text-red-700',
  HIDDEN: 'bg-red-50 text-red-700',
  MAYBE: 'bg-amber-50 text-amber-700',
  PENDING: 'bg-amber-50 text-amber-700',
};

/** Badge colored by RSVP / moderation status. */
export function StatusBadge({
  status,
  children,
}: {
  status?: string;
  children: ReactNode;
}) {
  return (
    <Badge variant="secondary" className={cn(status && STATUS_TONES[status])}>
      {children}
    </Badge>
  );
}

export function FormField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Field className={className}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
    </Field>
  );
}

/** Lays out several FormFields side by side, wrapping on small screens. */
export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <div
      className={'grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]'}
    >
      {children}
    </div>
  );
}

export function FormAlert({
  tone,
  children,
}: {
  tone: 'success' | 'error';
  children: ReactNode;
}) {
  return (
    <Alert
      variant={tone === 'error' ? 'destructive' : 'default'}
      className={cn(tone === 'success' && 'border-green-200 text-green-700')}
    >
      <AlertDescription className={cn(tone === 'success' && 'text-green-700')}>
        {children}
      </AlertDescription>
    </Alert>
  );
}
