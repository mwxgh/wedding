'use client';

import { useMemo, useState } from 'react';

import {
  AlertTriangleIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  Trash2Icon,
  WalletIcon,
  XIcon,
} from 'lucide-react';

import type {
  AdminExpense,
  ExpenseInput,
  PaymentInput,
  PlanCategory,
  Side,
} from '@repo/types';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@repo/ui/components/native-select';
import { toast } from '@repo/ui/components/sonner';
import { Textarea } from '@repo/ui/components/textarea';
import { cn } from '@repo/ui/lib/utils';

import { FieldRow, FormField } from '../../../_components/common';
import {
  PLAN_CATEGORY_LABEL,
  SIDE_LABEL,
  formatDay,
  formatVndShort,
  fromDateInput,
  toDateInput,
} from '../../../_lib/format';
import { Meter } from '../../_components/stats';
import { useAuth } from '../../_lib/auth';
import { FormDialog } from '../../_lib/ui';
import { DueLabel } from './overview';

const paidOf = (e: AdminExpense) =>
  e.payments.reduce((n, p) => n + Number(p.amount), 0);

/** Payment state derived from the amounts, never stored. */
function ExpenseStatus({ expense }: { expense: AdminExpense }) {
  const paid = paidOf(expense);
  const est = Number(expense.estimated);
  if (paid === 0)
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <CircleDashedIcon aria-hidden />
        Chưa chi
      </Badge>
    );
  if (est > 0 && paid > est)
    return (
      <Badge variant="destructive">
        <AlertTriangleIcon aria-hidden />
        Vượt dự kiến
      </Badge>
    );
  if (est > 0 && paid >= est)
    return (
      <Badge variant="secondary">
        <CircleCheckIcon aria-hidden />
        Đã thanh toán đủ
      </Badge>
    );
  return (
    <Badge className="bg-accent text-accent-foreground">
      <CircleDotIcon aria-hidden />
      Đã cọc
    </Badge>
  );
}

/** VND number input with a readable echo (e.g. "150 tr ₫"). */
export function MoneyInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <Input
        type="number"
        min={0}
        step={1000}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      {value && Number(value) > 0 && (
        <span className="text-xs font-medium text-primary tabular-nums">
          ≈ {formatVndShort(value)} ₫
        </span>
      )}
    </div>
  );
}

interface ExpenseForm {
  id?: string;
  category: PlanCategory;
  name: string;
  vendor: string;
  estimated: string;
  side: Side;
  dueDate: string;
  note: string;
}

const emptyExpense: ExpenseForm = {
  category: 'OTHER',
  name: '',
  vendor: '',
  estimated: '',
  side: 'BOTH',
  dueDate: '',
  note: '',
};

interface PaymentForm {
  expense: AdminExpense;
  amount: string;
  paidAt: string;
  note: string;
}

export function ExpensesTab({
  expenses,
  reload,
}: {
  expenses: AdminExpense[];
  reload: () => Promise<void>;
}) {
  const { api } = useAuth();
  const [form, setForm] = useState<ExpenseForm | null>(null);
  const [payment, setPayment] = useState<PaymentForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<PlanCategory, AdminExpense[]>();
    for (const e of expenses) {
      map.set(e.category, [...(map.get(e.category) ?? []), e]);
    }
    return [...map.entries()];
  }, [expenses]);

  const set = (patch: Partial<ExpenseForm>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...f } = form;
    const body: ExpenseInput = {
      category: f.category,
      name: f.name,
      vendor: f.vendor || undefined,
      estimated: f.estimated ? Number(f.estimated) : 0,
      side: f.side,
      dueDate: fromDateInput(f.dueDate),
      note: f.note || undefined,
    };
    try {
      await api(id ? `/admin/plan/expenses/${id}` : '/admin/plan/expenses', {
        method: id ? 'PATCH' : 'POST',
        body,
      });
      setForm(null);
      toast.success('Đã lưu khoản chi');
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payment) return;
    const body: PaymentInput = {
      amount: Number(payment.amount),
      paidAt: fromDateInput(payment.paidAt) ?? undefined,
      note: payment.note || undefined,
    };
    try {
      await api(`/admin/plan/expenses/${payment.expense.id}/payments`, {
        body,
      });
      setPayment(null);
      toast.success('Đã ghi lần chi');
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeExpense(e: AdminExpense) {
    if (!confirm(`Xoá khoản chi "${e.name}" và các lần chi của nó?`)) return;
    await api(`/admin/plan/expenses/${e.id}`, { method: 'DELETE' });
    await reload();
  }

  async function removePayment(id: string) {
    if (!confirm('Xoá lần chi này?')) return;
    await api(`/admin/plan/payments/${id}`, { method: 'DELETE' });
    await reload();
  }

  const openEdit = (e: AdminExpense) => {
    setError(null);
    setForm({
      id: e.id,
      category: e.category,
      name: e.name,
      vendor: e.vendor ?? '',
      estimated: Number(e.estimated) ? e.estimated : '',
      side: e.side,
      dueDate: toDateInput(e.dueDate),
      note: e.note ?? '',
    });
  };

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button
          size="lg"
          className="max-sm:h-11 max-sm:w-full"
          onClick={() => {
            setError(null);
            setForm(emptyExpense);
          }}
        >
          <PlusIcon data-icon="inline-start" aria-hidden />
          Thêm khoản chi
        </Button>
      </div>

      <div className="grid gap-4">
        {groups.map(([category, items]) => {
          const est = items.reduce((n, e) => n + Number(e.estimated), 0);
          const paid = items.reduce((n, e) => n + paidOf(e), 0);
          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  {PLAN_CATEGORY_LABEL[category]}
                </CardTitle>
                <CardAction
                  className={`rounded-full bg-muted px-3 py-1 text-sm
                  text-muted-foreground tabular-nums`}
                >
                  <span className="font-medium text-foreground">
                    {formatVndShort(paid)}
                  </span>{' '}
                  / {formatVndShort(est)} ₫
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-1">
                {items.map((e) => {
                  const p = paidOf(e);
                  const ex = Number(e.estimated);
                  return (
                    <div
                      key={e.id}
                      className={`-mx-2 grid gap-3 rounded-xl px-2 py-3
                      transition-colors hover:bg-muted/40
                      sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-center`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{e.name}</span>
                          <ExpenseStatus expense={e} />
                          {e.side !== 'BOTH' && (
                            <Badge variant="outline">
                              {SIDE_LABEL[e.side]}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[e.vendor, e.note].filter(Boolean).join(' · ')}
                          {e.dueDate && (
                            <>
                              {(e.vendor || e.note) && ' · '}
                              Hạn:{' '}
                              <DueLabel
                                iso={e.dueDate}
                                done={p >= ex && ex > 0}
                              />
                            </>
                          )}
                        </p>
                        {e.payments.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {e.payments.map((pay) => (
                              <li
                                key={pay.id}
                                className={`inline-flex items-center gap-1
                                rounded-full border bg-card py-0.5 pr-0.5 pl-2.5
                                text-xs tabular-nums shadow-xs`}
                              >
                                {formatVndShort(pay.amount)} ₫ ·{' '}
                                {formatDay(pay.paidAt)}
                                {pay.note && ` · ${pay.note}`}
                                <button
                                  type="button"
                                  title="Xoá lần chi"
                                  aria-label={`Xoá lần chi ${formatVndShort(pay.amount)} ₫`}
                                  className={`grid size-6 place-items-center
                                  rounded-full text-muted-foreground
                                  transition-colors outline-none
                                  hover:bg-destructive/10 hover:text-destructive
                                  focus-visible:ring-2
                                  focus-visible:ring-ring/50`}
                                  onClick={() => removePayment(pay.id)}
                                >
                                  <XIcon aria-hidden className="size-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="grid gap-1">
                        <Meter value={p} max={Math.max(1, ex, p)} />
                        <span
                          className={cn(
                            'text-xs tabular-nums',
                            ex
                              ? 'text-muted-foreground'
                              : 'text-accent-foreground',
                          )}
                        >
                          {formatVndShort(p)} /{' '}
                          {ex ? `${formatVndShort(ex)} ₫` : 'chưa dự kiến'}
                        </span>
                      </div>
                      <div className="flex gap-1.5 sm:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="max-sm:h-11 max-sm:flex-1"
                          onClick={() => {
                            setError(null);
                            setPayment({
                              expense: e,
                              amount: ex > p ? String(ex - p) : '',
                              paidAt: toDateInput(new Date().toISOString()),
                              note: '',
                            });
                          }}
                        >
                          <WalletIcon data-icon="inline-start" aria-hidden />
                          Ghi chi
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="max-sm:size-11"
                          title="Sửa"
                          aria-label={`Sửa khoản chi "${e.name}"`}
                          onClick={() => openEdit(e)}
                        >
                          <PencilIcon aria-hidden />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          className="max-sm:size-11"
                          title="Xoá"
                          aria-label={`Xoá khoản chi "${e.name}"`}
                          onClick={() => removeExpense(e)}
                        >
                          <Trash2Icon aria-hidden />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
        {!groups.length && (
          <div
            className={`flex flex-col items-center gap-2 rounded-2xl border
            border-dashed bg-card/60 px-6 py-14 text-center`}
          >
            <ReceiptIcon aria-hidden className="size-8 text-muted-foreground" />
            <p className="font-medium">Chưa có khoản chi nào</p>
            <p className="text-sm text-muted-foreground">
              Thêm khoản chi để theo dõi ngân sách và các lần thanh toán.
            </p>
          </div>
        )}
      </div>

      <FormDialog
        open={!!form}
        title={form?.id ? 'Sửa khoản chi' : 'Thêm khoản chi'}
        error={error}
        onClose={() => setForm(null)}
        onSubmit={saveExpense}
      >
        {form && (
          <>
            <FieldRow>
              <FormField label="Hạng mục">
                <NativeSelect
                  className="w-full"
                  value={form.category}
                  onChange={(e) =>
                    set({ category: e.target.value as PlanCategory })
                  }
                >
                  {Object.entries(PLAN_CATEGORY_LABEL).map(([v, l]) => (
                    <NativeSelectOption key={v} value={v}>
                      {l}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Bên chi">
                <NativeSelect
                  className="w-full"
                  value={form.side}
                  onChange={(e) => set({ side: e.target.value as Side })}
                >
                  <NativeSelectOption value="BOTH">Chung</NativeSelectOption>
                  <NativeSelectOption value="GROOM">
                    Nhà trai
                  </NativeSelectOption>
                  <NativeSelectOption value="BRIDE">Nhà gái</NativeSelectOption>
                </NativeSelect>
              </FormField>
            </FieldRow>
            <FormField label="Tên khoản chi">
              <Input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Nhà cung cấp (tuỳ chọn)">
              <Input
                value={form.vendor}
                onChange={(e) => set({ vendor: e.target.value })}
              />
            </FormField>
            <FieldRow>
              <FormField label="Dự kiến (VND)">
                <MoneyInput
                  value={form.estimated}
                  onChange={(v) => set({ estimated: v })}
                />
              </FormField>
              <FormField label="Hạn thanh toán">
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                />
              </FormField>
            </FieldRow>
            <FormField label="Ghi chú">
              <Textarea
                value={form.note}
                onChange={(e) => set({ note: e.target.value })}
              />
            </FormField>
          </>
        )}
      </FormDialog>

      <FormDialog
        open={!!payment}
        title={`Ghi chi · ${payment?.expense.name ?? ''}`}
        description="Ghi lại một lần thanh toán (đặt cọc hoặc trả nốt)."
        submitLabel="Ghi chi"
        error={error}
        onClose={() => setPayment(null)}
        onSubmit={savePayment}
      >
        {payment && (
          <>
            <FieldRow>
              <FormField label="Số tiền (VND)">
                <MoneyInput
                  value={payment.amount}
                  onChange={(v) => setPayment({ ...payment, amount: v })}
                  required
                />
              </FormField>
              <FormField label="Ngày chi">
                <Input
                  type="date"
                  value={payment.paidAt}
                  onChange={(e) =>
                    setPayment({ ...payment, paidAt: e.target.value })
                  }
                />
              </FormField>
            </FieldRow>
            <FormField label="Ghi chú (vd: Đặt cọc, Thanh toán nốt)">
              <Input
                value={payment.note}
                onChange={(e) =>
                  setPayment({ ...payment, note: e.target.value })
                }
              />
            </FormField>
          </>
        )}
      </FormDialog>
    </>
  );
}
