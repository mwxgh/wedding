'use client';

import { Suspense, useEffect, useRef } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  CalendarHeartIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  GiftIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MailIcon,
  MessageSquareHeartIcon,
  SettingsIcon,
} from 'lucide-react';

import { buttonVariants } from '@repo/ui/components/button';
import { ConfirmProvider } from '@repo/ui/components/confirm-dialog';
import { cn } from '@repo/ui/lib/utils';

import { AuthProvider, useAuth } from './_lib/auth';

const NAV = [
  ['/admin', 'Tổng quan', LayoutDashboardIcon],
  ['/admin/plan', 'Kế hoạch', ClipboardListIcon],
  ['/admin/invitations', 'Thiệp mời & RSVP', MailIcon],
  ['/admin/events', 'Sự kiện & bàn tiệc', CalendarHeartIcon],
  ['/admin/guestbook', 'Sổ lưu bút', MessageSquareHeartIcon],
  ['/admin/photos', 'Album ảnh', ImagesIcon],
  ['/admin/gifts', 'Mừng cưới', GiftIcon],
  ['/admin/settings', 'Cài đặt', SettingsIcon],
] as const;

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, token, logout } = useAuth();
  const navRef = useRef<HTMLElement>(null);

  // the mobile nav scrolls sideways: keep the current page's link in view
  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname, ready, token]);

  if (pathname === '/admin/login') return <>{children}</>;
  if (!ready || !token) return null;

  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[260px_1fr]">
      <aside
        className={`sticky top-0 z-30 flex flex-col border-b
          border-sidebar-border bg-sidebar/90 backdrop-blur-md md:h-dvh
          md:border-r md:border-b-0 md:bg-sidebar`}
      >
        <div
          className={
            'flex items-center gap-3 px-4 py-3 md:px-5 md:pt-6 md:pb-5'
          }
        >
          <span
            aria-hidden
            className={`grid size-9 shrink-0 place-items-center rounded-xl
              bg-primary font-script text-xl text-primary-foreground shadow-sm`}
          >
            W
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-serif text-lg font-semibold tracking-tight">
              Wedding Admin
            </p>
            <p className="text-xs text-muted-foreground">Bảng điều khiển</p>
          </div>
          <div className="ml-auto flex gap-1 md:hidden">
            <a
              className={buttonVariants({ variant: 'ghost', size: 'icon-lg' })}
              href="/"
              target="_blank"
              rel="noreferrer"
              aria-label="Xem trang cưới"
            >
              <ExternalLinkIcon aria-hidden />
            </a>
            <button
              type="button"
              className={buttonVariants({ variant: 'ghost', size: 'icon-lg' })}
              onClick={logout}
              aria-label="Đăng xuất"
            >
              <LogOutIcon aria-hidden />
            </button>
          </div>
        </div>
        <nav
          ref={navRef}
          aria-label="Quản trị"
          className={`flex [scrollbar-width:none] gap-1 overflow-x-auto px-3
            pb-3 md:flex-1 md:flex-col md:overflow-x-visible md:overflow-y-auto
            md:px-3 md:pb-4`}
        >
          <p
            className={`hidden px-3 pb-2 text-xs font-medium tracking-wide
              text-muted-foreground uppercase md:block`}
          >
            Quản lý
          </p>
          {NAV.map(([href, label, Icon]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  `group relative flex h-11 shrink-0 items-center gap-3
                  rounded-xl px-3 text-sm font-medium whitespace-nowrap
                  text-muted-foreground transition-colors outline-none
                  hover:bg-sidebar-accent/70
                  hover:text-sidebar-accent-foreground focus-visible:ring-3
                  focus-visible:ring-ring/50 md:h-10`,
                  active &&
                    `bg-sidebar-accent text-sidebar-accent-foreground
                    md:before:absolute md:before:inset-y-2 md:before:-left-3
                    md:before:w-1 md:before:rounded-r-full md:before:bg-primary`,
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    'size-4 shrink-0 transition-colors',
                    active ? 'text-primary' : 'group-hover:text-primary',
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>
        <div
          className={`hidden flex-col gap-2 border-t border-sidebar-border p-3
            md:flex`}
        >
          <a
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'h-10 justify-start',
            )}
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLinkIcon data-icon="inline-start" aria-hidden />
            Xem trang cưới
          </a>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              `h-10 justify-start text-muted-foreground hover:bg-destructive/10
              hover:text-destructive`,
            )}
            onClick={logout}
          >
            <LogOutIcon data-icon="inline-start" aria-hidden />
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="min-w-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Shell>
          {/* pages read filters/tabs from the URL (useSearchParams) */}
          <Suspense>{children}</Suspense>
        </Shell>
      </ConfirmProvider>
    </AuthProvider>
  );
}
