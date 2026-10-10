'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  CalendarHeartIcon,
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
import { cn } from '@repo/ui/lib/utils';

import { AuthProvider, useAuth } from './_lib/auth';

const NAV = [
  ['/admin', 'Tổng quan', LayoutDashboardIcon],
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

  if (pathname === '/admin/login') return <>{children}</>;
  if (!ready || !token) return null;

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <nav
        className={`flex flex-row flex-wrap gap-1 border-b bg-sidebar p-3
          md:flex-col md:border-r md:border-b-0 md:px-3 md:py-6`}
      >
        <div
          className={`mb-1 w-full px-3 font-script text-3xl text-rose-deep
            md:mb-5`}
        >
          Wedding Admin
        </div>
        {NAV.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'lg' }),
              'justify-start',
              pathname === href &&
                'bg-sidebar-accent font-semibold text-sidebar-accent-foreground',
            )}
          >
            <Icon data-icon="inline-start" />
            {label}
          </Link>
        ))}
        <div className="flex gap-2 md:mt-auto md:flex-col">
          <a
            className={buttonVariants({ variant: 'outline' })}
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Xem trang cưới
          </a>
          <button
            className={buttonVariants({ variant: 'outline' })}
            onClick={logout}
          >
            <LogOutIcon data-icon="inline-start" />
            Đăng xuất
          </button>
        </div>
      </nav>
      <div className="min-w-0 px-4 py-5 md:px-8 md:py-8">{children}</div>
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
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
