'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  CalendarHeartIcon,
  HeartIcon,
  Loader2Icon,
  SaveIcon,
} from 'lucide-react';

import type {
  AdminEvent,
  EventTimingInput,
  EventVenueInput,
  ScheduleInput,
  WeddingInfoInput,
  WeddingInfoJson,
} from '@repo/types';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';
import { Skeleton } from '@repo/ui/components/skeleton';
import { toast } from '@repo/ui/components/sonner';
import { Textarea } from '@repo/ui/components/textarea';
import { vnDay } from '@repo/utils';

import { MapDialog } from '../../_components/MapDialog';
import { FieldRow, FormField } from '../../_components/common';
import { SIDE_LABEL } from '../../_lib/format';
import {
  EventTimingFields,
  formatWeddingDay,
} from '../_components/event-timing';
import { PayosSettings } from '../_components/payos-settings';
import { useAdminData, useAuth } from '../_lib/auth';
import { ErrorAlert, PageHeader } from '../_lib/ui';

const emptyInfo = {
  brideName: '',
  groomName: '',
  brideParents: '',
  groomParents: '',
  story: '',
};

type Timings = Record<string, EventTimingInput & EventVenueInput>;

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <Button type="submit" size="lg" className="max-sm:h-11" disabled={saving}>
      {saving ? (
        <Loader2Icon
          data-icon="inline-start"
          aria-hidden
          className="animate-spin motion-reduce:animate-none"
        />
      ) : (
        <SaveIcon data-icon="inline-start" aria-hidden />
      )}
      {saving ? 'Đang lưu…' : label}
    </Button>
  );
}

export default function SettingsPage() {
  const { api } = useAuth();
  const {
    data: wedding,
    error: weddingError,
    reload: reloadWedding,
  } = useAdminData<WeddingInfoJson | null>('/admin/wedding');
  const {
    data: events,
    error: eventsError,
    reload: reloadEvents,
  } = useAdminData<AdminEvent[]>('/admin/events');
  const [saving, setSaving] = useState<'schedule' | 'info' | null>(null);

  // Saved values; the forms edit drafts on top of them, so data arriving
  // late never overwrites what was typed and "dirty" is a plain comparison.
  const savedInfo = useMemo(
    () =>
      wedding
        ? {
            brideName: wedding.brideName,
            groomName: wedding.groomName,
            brideParents: wedding.brideParents ?? '',
            groomParents: wedding.groomParents ?? '',
            story: wedding.story ?? '',
          }
        : emptyInfo,
    [wedding],
  );
  const savedDay = wedding ? vnDay(wedding.weddingDate) : '';
  const savedTimings = useMemo<Timings>(
    () =>
      Object.fromEntries(
        (events ?? []).map((e) => [
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
    [events],
  );

  const [infoDraft, setInfoDraft] = useState<typeof emptyInfo | null>(null);
  const [dayDraft, setDayDraft] = useState<string | null>(null);
  const [timingsDraft, setTimingsDraft] = useState<Timings | null>(null);
  const info = infoDraft ?? savedInfo;
  // the one place dates are set: wedding day + each event's time
  const day = dayDraft ?? savedDay;
  const timings = timingsDraft ?? savedTimings;

  const scheduleDirty =
    (dayDraft !== null && dayDraft !== savedDay) ||
    (timingsDraft !== null &&
      JSON.stringify(timingsDraft) !== JSON.stringify(savedTimings));
  const infoDirty =
    infoDraft !== null &&
    JSON.stringify(infoDraft) !== JSON.stringify(savedInfo);
  const dirty = scheduleDirty || infoDirty;

  // warn before leaving the page (reload/close tab) with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setTimings = (update: (t: Timings) => Timings) =>
    setTimingsDraft((d) => update(d ?? savedTimings));

  const setVenue = (id: string, patch: Partial<EventVenueInput>) =>
    setTimings((s) => (s[id] ? { ...s, [id]: { ...s[id], ...patch } } : s));

  async function saveSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const body: ScheduleInput = {
      weddingDate: day,
      events: Object.entries(timings).map(([id, t]) => ({
        id,
        ...t,
        mapUrl: t.mapUrl || null,
      })),
    };
    setSaving('schedule');
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
      await Promise.all([reloadEvents(), reloadWedding()]);
      setDayDraft(null);
      setTimingsDraft(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    // the date only travels with the very first save
    const body: WeddingInfoInput = {
      ...info,
      weddingDate: wedding ? undefined : day || undefined,
    };
    setSaving('info');
    try {
      await api('/admin/wedding', { method: 'PUT', body });
      toast.success('Đã lưu thông tin đám cưới');
      await reloadWedding();
      setInfoDraft(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  const setI = (patch: Partial<typeof info>) =>
    setInfoDraft((s) => ({ ...(s ?? savedInfo), ...patch }));

  const loadError = weddingError ?? eventsError;
  // `wedding` may legitimately be null (not set up yet), so wait on events
  const loading = !events && !eventsError;

  return (
    <>
      <PageHeader title="Cài đặt" />
      <ErrorAlert
        error={loadError}
        onRetry={() => void Promise.all([reloadWedding(), reloadEvents()])}
      />
      {loading && !loadError && (
        <div className="grid gap-6" role="status" aria-label="Đang tải…">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}
      {!loading && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-serif text-xl">
                <span
                  className={`grid size-9 place-items-center rounded-xl
                  bg-secondary text-primary`}
                >
                  <CalendarHeartIcon aria-hidden className="size-5" />
                </span>
                Ngày giờ & địa điểm
              </CardTitle>
              <CardDescription className="max-w-prose">
                Nguồn duy nhất cho ngày giờ và địa điểm: trang thiệp, đếm ngược,
                các sự kiện và hạn trong Kế hoạch đều tính theo đây.
              </CardDescription>
            </CardHeader>
            <form onSubmit={saveSchedule} className="contents">
              <CardContent className="flex flex-col gap-5">
                <FormField label="Ngày cưới">
                  <Input
                    type="date"
                    className="max-w-56"
                    value={day}
                    onChange={(e) => setDayDraft(e.target.value)}
                    required
                  />
                  {day && (
                    <p
                      className={`inline-flex w-fit items-center rounded-full
                      bg-accent px-3 py-1 text-sm font-medium
                      text-accent-foreground capitalize`}
                    >
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
                      className={`grid gap-3 rounded-2xl border bg-muted/30 p-4
                      sm:p-5`}
                    >
                      <legend
                        className={`flex items-center gap-2 rounded-full border
                        bg-card px-3 py-1 text-sm font-semibold shadow-xs`}
                      >
                        {ev.name}
                        <span className="font-normal text-muted-foreground">
                          · {SIDE_LABEL[ev.side]}
                        </span>
                      </legend>
                      <EventTimingFields
                        value={t}
                        weddingDay={day || null}
                        onChange={(next) =>
                          setTimings((s) => ({
                            ...s,
                            [ev.id]: { ...s[ev.id]!, ...next },
                          }))
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
                      <FormField
                        label="Link Google Maps (không bắt buộc — để trống thì tìm theo địa chỉ)"
                        htmlFor={`map-url-${ev.id}`}
                      >
                        <div className="flex flex-wrap gap-2">
                          <Input
                            id={`map-url-${ev.id}`}
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
                  <p
                    className={`rounded-xl border border-dashed px-4 py-6
                    text-center text-sm text-muted-foreground`}
                  >
                    Chưa có sự kiện. Thêm ở trang Sự kiện & bàn tiệc.
                  </p>
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <SaveButton
                  saving={saving === 'schedule'}
                  label="Lưu ngày giờ & địa điểm"
                />
              </CardFooter>
            </form>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-serif text-xl">
                <span
                  className={`grid size-9 place-items-center rounded-xl
                  bg-secondary text-primary`}
                >
                  <HeartIcon aria-hidden className="size-5" />
                </span>
                Thông tin đám cưới
              </CardTitle>
              <CardDescription>
                Tên cô dâu chú rể, bố mẹ hai bên và câu chuyện hiển thị trên
                thiệp.
              </CardDescription>
            </CardHeader>
            <form onSubmit={saveInfo} className="contents">
              <CardContent className="flex flex-col gap-4">
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
              </CardContent>
              <CardFooter className="justify-end">
                <SaveButton saving={saving === 'info'} label="Lưu thông tin" />
              </CardFooter>
            </form>
          </Card>
        </>
      )}
      <PayosSettings />
    </>
  );
}
