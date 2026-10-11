'use client';

import { useEffect, useState } from 'react';

import { CalendarHeartIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import {
  type AdminEvent,
  type BankAccountInput,
  type BankAccountJson,
  type EventTimingInput,
  type EventVenueInput,
  type ScheduleInput,
  type Side,
  type WeddingInfoInput,
  type WeddingInfoJson,
  vnDay,
} from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@repo/ui/components/native-select';
import { toast } from '@repo/ui/components/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { Textarea } from '@repo/ui/components/textarea';

import { MapDialog } from '../../_components/MapDialog';
import { FieldRow, FormField } from '../../_components/common';
import { SIDE_LABEL } from '../../_lib/format';
import {
  EventTimingFields,
  formatWeddingDay,
} from '../_components/event-timing';
import { useAdminData, useAuth } from '../_lib/auth';
import { PageHeader } from '../_lib/ui';

const emptyInfo = {
  brideName: '',
  groomName: '',
  brideParents: '',
  groomParents: '',
  story: '',
};

const emptyBank: BankAccountInput = {
  side: 'GROOM',
  bankBin: '',
  accountNumber: '',
  accountName: '',
};

export default function SettingsPage() {
  const { api } = useAuth();
  const { data: wedding } = useAdminData<WeddingInfoJson | null>(
    '/admin/wedding',
  );
  const { data: banks, reload: reloadBanks } = useAdminData<BankAccountJson[]>(
    '/admin/bank-accounts',
  );
  const { data: events, reload: reloadEvents } =
    useAdminData<AdminEvent[]>('/admin/events');
  const [info, setInfo] = useState(emptyInfo);
  const [bank, setBank] = useState(emptyBank);
  // the one place dates are set: wedding day + each event's time
  const [day, setDay] = useState('');
  const [timings, setTimings] = useState<
    Record<string, EventTimingInput & EventVenueInput>
  >({});

  useEffect(() => {
    if (wedding) setDay(vnDay(wedding.weddingDate));
  }, [wedding]);

  useEffect(() => {
    if (events)
      setTimings(
        Object.fromEntries(
          events.map((e) => [
            e.id,
            {
              dayOffset: e.dayOffset,
              startTime: e.startTime,
              endTime: e.endTime,
              venueName: e.venueName,
              address: e.address,
              mapUrl: e.mapUrl ?? '',
            },
          ]),
        ),
      );
  }, [events]);

  const setVenue = (id: string, patch: Partial<EventVenueInput>) =>
    setTimings((s) => (s[id] ? { ...s, [id]: { ...s[id], ...patch } } : s));

  async function saveSchedule(e: React.FormEvent) {
    e.preventDefault();
    const body: ScheduleInput = {
      weddingDate: day,
      events: Object.entries(timings).map(([id, t]) => ({
        id,
        ...t,
        mapUrl: t.mapUrl || null,
      })),
    };
    try {
      const res = await api<{ rescheduled: number }>('/admin/schedule', {
        method: 'PUT',
        body,
      });
      toast.success(
        res.rescheduled
          ? `Đã lưu. Hạn của ${res.rescheduled} việc trong Kế hoạch đã dời theo`
          : 'Đã lưu ngày giờ & địa điểm',
      );
      await reloadEvents();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  useEffect(() => {
    if (wedding)
      setInfo({
        brideName: wedding.brideName,
        groomName: wedding.groomName,
        brideParents: wedding.brideParents ?? '',
        groomParents: wedding.groomParents ?? '',
        story: wedding.story ?? '',
      });
  }, [wedding]);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    // the date only travels with the very first save
    const body: WeddingInfoInput = {
      ...info,
      weddingDate: wedding ? undefined : day || undefined,
    };
    try {
      await api('/admin/wedding', { method: 'PUT', body });
      toast.success('Đã lưu thông tin đám cưới');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function addBank(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/bank-accounts', { body: bank });
      setBank(emptyBank);
      toast.success('Đã thêm tài khoản');
      await reloadBanks();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function removeBank(id: string) {
    if (!confirm('Xoá tài khoản này?')) return;
    await api(`/admin/bank-accounts/${id}`, { method: 'DELETE' });
    await reloadBanks();
  }

  const setI = (patch: Partial<typeof info>) =>
    setInfo((s) => ({ ...s, ...patch }));

  return (
    <>
      <PageHeader title="Cài đặt" />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <CalendarHeartIcon className="size-5 text-primary" />
            Ngày giờ & địa điểm
          </CardTitle>
          <CardDescription>
            Nguồn duy nhất cho ngày giờ và địa điểm: trang thiệp, đếm ngược, các
            sự kiện và hạn trong Kế hoạch đều tính theo đây.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveSchedule} className="flex flex-col gap-5">
            <FormField label="Ngày cưới">
              <Input
                type="date"
                className="max-w-56"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
              />
              {day && (
                <p className="text-sm text-muted-foreground capitalize">
                  {formatWeddingDay(day)}
                </p>
              )}
            </FormField>
            {events?.map((ev) => {
              const t = timings[ev.id];
              if (!t) return null;
              return (
                <fieldset
                  key={ev.id}
                  className="grid gap-2 rounded-xl border p-4"
                >
                  <legend className="px-1 font-medium">
                    {ev.name}{' '}
                    <span className="font-normal text-muted-foreground">
                      · {SIDE_LABEL[ev.side]}
                    </span>
                  </legend>
                  <EventTimingFields
                    value={t}
                    weddingDay={day || null}
                    onChange={(next) =>
                      setTimings((s) => ({ ...s, [ev.id]: { ...t, ...next } }))
                    }
                  />
                  <FieldRow>
                    <FormField label="Địa điểm">
                      <Input
                        value={t.venueName}
                        onChange={(e) =>
                          setVenue(ev.id, { venueName: e.target.value })
                        }
                        required
                      />
                    </FormField>
                    <FormField label="Địa chỉ">
                      <Input
                        value={t.address}
                        onChange={(e) =>
                          setVenue(ev.id, { address: e.target.value })
                        }
                        required
                      />
                    </FormField>
                  </FieldRow>
                  <FormField label="Link Google Maps (không bắt buộc — để trống thì tìm theo địa chỉ)">
                    <div className="flex flex-wrap gap-2">
                      <Input
                        type="url"
                        className="min-w-0 flex-1"
                        placeholder="https://maps.app.goo.gl/…"
                        value={t.mapUrl ?? ''}
                        onChange={(e) =>
                          setVenue(ev.id, { mapUrl: e.target.value })
                        }
                      />
                      {t.address && (
                        <MapDialog
                          venue={t}
                          title={ev.name}
                          label="Xem trước"
                        />
                      )}
                    </div>
                  </FormField>
                </fieldset>
              );
            })}
            {events && !events.length && (
              <p className="text-sm text-muted-foreground">
                Chưa có sự kiện. Thêm ở trang Sự kiện & bàn tiệc.
              </p>
            )}
            <Button type="submit" size="lg" className="self-start">
              Lưu ngày giờ & địa điểm
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif text-xl">
            Thông tin đám cưới
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveInfo} className="flex flex-col gap-4">
            <FieldRow>
              <FormField label="Tên chú rể">
                <Input
                  value={info.groomName}
                  onChange={(e) => setI({ groomName: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Tên cô dâu">
                <Input
                  value={info.brideName}
                  onChange={(e) => setI({ brideName: e.target.value })}
                  required
                />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Bố mẹ chú rể">
                <Input
                  value={info.groomParents}
                  onChange={(e) => setI({ groomParents: e.target.value })}
                />
              </FormField>
              <FormField label="Bố mẹ cô dâu">
                <Input
                  value={info.brideParents}
                  onChange={(e) => setI({ brideParents: e.target.value })}
                />
              </FormField>
            </FieldRow>
            <FormField label="Câu chuyện tình yêu">
              <Textarea
                rows={5}
                value={info.story}
                onChange={(e) => setI({ story: e.target.value })}
              />
            </FormField>
            <Button type="submit" size="lg" className="self-start">
              Lưu thông tin
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">
            Tài khoản nhận mừng cưới (VietQR)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bên</TableHead>
                <TableHead>Mã BIN</TableHead>
                <TableHead>Số tài khoản</TableHead>
                <TableHead>Chủ tài khoản</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks?.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{SIDE_LABEL[b.side]}</TableCell>
                  <TableCell>{b.bankBin}</TableCell>
                  <TableCell>{b.accountNumber}</TableCell>
                  <TableCell>{b.accountName}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      title="Xoá"
                      onClick={() => removeBank(b.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {banks && !banks.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Chưa có tài khoản.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <form onSubmit={addBank} className="flex flex-col gap-4">
            <FieldRow>
              <FormField label="Bên">
                <NativeSelect
                  className="w-full"
                  value={bank.side}
                  onChange={(e) =>
                    setBank({ ...bank, side: e.target.value as Side })
                  }
                >
                  <NativeSelectOption value="GROOM">
                    Nhà trai
                  </NativeSelectOption>
                  <NativeSelectOption value="BRIDE">Nhà gái</NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField label="Mã BIN ngân hàng (vd: 970436 = VCB)">
                <Input
                  value={bank.bankBin}
                  onChange={(e) =>
                    setBank({ ...bank, bankBin: e.target.value })
                  }
                  required
                />
              </FormField>
              <FormField label="Số tài khoản">
                <Input
                  value={bank.accountNumber}
                  onChange={(e) =>
                    setBank({ ...bank, accountNumber: e.target.value })
                  }
                  required
                />
              </FormField>
              <FormField label="Chủ tài khoản (không dấu)">
                <Input
                  value={bank.accountName}
                  onChange={(e) =>
                    setBank({
                      ...bank,
                      accountName: e.target.value.toUpperCase(),
                    })
                  }
                  required
                />
              </FormField>
            </FieldRow>
            <Button type="submit" variant="outline" className="self-start">
              <PlusIcon data-icon="inline-start" />
              Thêm tài khoản
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
