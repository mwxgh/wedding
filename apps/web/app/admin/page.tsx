'use client';

import Link from 'next/link';

import type { Dashboard } from '@repo/contracts';
import { Card, CardContent } from '@repo/ui/components/card';
import CountUp from '@repo/ui/components/reactbits/count-up';
import { Skeleton } from '@repo/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';

import { formatDateTime } from '../_lib/format';
import { useAdminData } from './_lib/auth';
import { ErrorAlert, PageHeader } from './_lib/ui';

function Stat({
  value,
  label,
  suffix,
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <Card className="h-full">
      <CardContent>
        <b className="block font-serif text-3xl font-medium text-rose-deep">
          <CountUp to={value} separator="." duration={1} />
          {suffix}
        </b>
        <span className="text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, error } = useAdminData<Dashboard>('/admin/dashboard');

  return (
    <>
      <PageHeader title="Tổng quan" />
      <ErrorAlert error={error} />
      {!data && !error && (
        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
      {data && (
        <>
          <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat value={data.invitations.total} label="Thiệp mời" />
            <Stat value={data.invitations.opened} label="Đã mở thiệp" />
            <Link href="/admin/guestbook">
              <Stat value={data.guestbookPending} label="Lời chúc chờ duyệt" />
            </Link>
            <Link href="/admin/photos">
              <Stat value={data.photosPending} label="Ảnh chờ duyệt" />
            </Link>
            <Stat
              value={Number(data.gifts.totalAmount)}
              suffix=" ₫"
              label={`Mừng cưới (${data.gifts.count} lượt)`}
            />
          </div>

          <h2 className="mb-3 font-serif text-xl">RSVP theo sự kiện</h2>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sự kiện</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Đã mời</TableHead>
                  <TableHead>Tham dự</TableHead>
                  <TableHead>Chưa chắc</TableHead>
                  <TableHead>Không đến</TableHead>
                  <TableHead>Chưa trả lời</TableHead>
                  <TableHead>Tổng khách dự kiến</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{formatDateTime(e.startAt)}</TableCell>
                    <TableCell>{e.invited}</TableCell>
                    <TableCell>{e.attending}</TableCell>
                    <TableCell>{e.maybe}</TableCell>
                    <TableCell>{e.declined}</TableCell>
                    <TableCell>{e.pending}</TableCell>
                    <TableCell className="font-semibold">
                      {e.headcount}
                    </TableCell>
                  </TableRow>
                ))}
                {!data.events.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      Chưa có sự kiện nào.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
