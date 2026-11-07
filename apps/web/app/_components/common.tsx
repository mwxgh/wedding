import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId,
} from 'react';

import { Alert, AlertDescription } from '@repo/ui/components/alert';
import { Badge } from '@repo/ui/components/badge';
import { Field, FieldLabel } from '@repo/ui/components/field';
import { cn } from '@repo/ui/lib/utils';

import { OrnamentDivider } from './ornaments';

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)}
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
    <section
      id={id}
      className={cn(
        'relative scroll-mt-16 py-16 sm:py-24',
        alt &&
          `border-y border-border/60 bg-gradient-to-b from-muted/70 via-muted/40
          to-background`,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

export function SectionTitle({
  script,
  title,
}: {
  /** Small italic lead-in above the title. */
  script: string;
  title: string;
}) {
  return (
    <div className="mb-10 flex flex-col items-center text-center sm:mb-14">
      <span
        className={'font-serif text-lg text-muted-foreground italic sm:text-xl'}
      >
        {script}
      </span>
      <h2
        className={`mt-1 font-serif text-xl font-semibold tracking-[0.18em]
          text-rose-deep uppercase sm:text-2xl`}
      >
        {title}
      </h2>
      <OrnamentDivider className="mt-4" />
    </div>
  );
}

const TONE = {
  success: 'border-success/30 bg-success/10 text-success',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border-warning/30 bg-warning/10 text-warning',
};

const STATUS_TONES: Record<string, string> = {
  ATTENDING: TONE.success,
  APPROVED: TONE.success,
  DECLINED: TONE.danger,
  HIDDEN: TONE.danger,
  MAYBE: TONE.warning,
  PENDING: TONE.warning,
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
    <Badge
      variant="secondary"
      className={cn(
        'h-6 border-border/60 px-2.5 tracking-wide',
        status && STATUS_TONES[status],
      )}
    >
      {children}
    </Badge>
  );
}

/**
 * Label + control. Without `htmlFor`, a single child element gets a generated
 * `id` (unless it has one) so the label is programmatically tied to it.
 * Pass `htmlFor` when the control is nested inside a wrapper.
 */
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
  const autoId = useId();
  let id = htmlFor;
  let content = children;
  if (!htmlFor && isValidElement<{ id?: string }>(children)) {
    const own = children.props.id;
    id = own ?? autoId;
    if (!own)
      content = cloneElement(children as ReactElement<{ id?: string }>, { id });
  }
  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {content}
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
      className={cn(
        'rounded-xl',
        tone === 'success' &&
          'border-primary/20 bg-secondary text-secondary-foreground',
      )}
    >
      <AlertDescription
        className={cn(tone === 'success' && 'text-secondary-foreground')}
      >
        {children}
      </AlertDescription>
    </Alert>
  );
}
