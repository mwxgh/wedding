import * as React from 'react';

import { cn } from 'cn';

/** Placeholder for a list with nothing to show yet (or no search results). */
function Empty({
  icon,
  title,
  description,
  action,
  bare = false,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Drop the dashed card, e.g. inside a table cell. */
  bare?: boolean;
}) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex flex-col items-center gap-2 px-6 py-14 text-center',
        !bare && 'rounded-2xl border border-dashed bg-card/60',
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          aria-hidden
          className={`mb-1 grid size-12 place-items-center rounded-full
          bg-secondary text-secondary-foreground [&_svg]:size-5`}
        >
          {icon}
        </span>
      )}
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { Empty };
