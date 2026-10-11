'use client';

import { useMemo, useState } from 'react';

import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import type {
  AdminExpense,
  AdminTask,
  PlanCategory,
  Side,
  TaskInput,
} from '@repo/contracts';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Checkbox } from '@repo/ui/components/checkbox';
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
  daysUntil,
  fromDateInput,
  toDateInput,
} from '../../../_lib/format';
import { useAuth } from '../../_lib/auth';
import { FormDialog } from '../../_lib/ui';
import { DueLabel } from './overview';

type Group = 'overdue' | 'soon' | 'later' | 'undated' | 'done';

const GROUPS: { key: Group; title: string; hint?: string }[] = [
  { key: 'overdue', title: 'Quá hạn' },
  { key: 'soon', title: 'Trong 2 tuần tới' },
  { key: 'later', title: 'Sắp tới' },
  { key: 'undated', title: 'Chưa đặt hạn' },
  { key: 'done', title: 'Đã xong' },
];

const groupOf = (t: AdminTask): Group => {
  if (t.doneAt) return 'done';
  if (!t.dueDate) return 'undated';
  const d = daysUntil(t.dueDate);
  if (d < 0) return 'overdue';
  return d <= 14 ? 'soon' : 'later';
};

interface TaskForm {
  id?: string;
  title: string;
  category: PlanCategory;
  dueDate: string;
  assignee: Side | '';
  expenseId: string;
  note: string;
}

const emptyTask: TaskForm = {
  title: '',
  category: 'OTHER',
  dueDate: '',
  assignee: '',
  expenseId: '',
  note: '',
};

export function TasksTab({
  tasks,
  expenses,
  reload,
}: {
  tasks: AdminTask[];
  expenses: AdminExpense[];
  reload: () => Promise<void>;
}) {
  const { api } = useAuth();
  const [form, setForm] = useState<TaskForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  // optimistic check state while the request is in flight
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const map = new Map<Group, AdminTask[]>();
    for (const t of tasks) {
      const g = groupOf(t);
      map.set(g, [...(map.get(g) ?? []), t]);
    }
    return map;
  }, [tasks]);

  const set = (patch: Partial<TaskForm>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  async function toggle(t: AdminTask, done: boolean) {
    setPending((p) => ({ ...p, [t.id]: done }));
    try {
      await api(`/admin/plan/tasks/${t.id}`, {
        method: 'PATCH',
        body: { done },
      });
      await reload();
      if (done) toast.success(`Đã xong: ${t.title}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(({ [t.id]: _, ...rest }) => rest);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...f } = form;
    const body: TaskInput = {
      title: f.title,
      category: f.category,
      dueDate: fromDateInput(f.dueDate),
      assignee: f.assignee || null,
      expenseId: f.expenseId || null,
      note: f.note || undefined,
    };
    try {
      await api(id ? `/admin/plan/tasks/${id}` : '/admin/plan/tasks', {
        method: id ? 'PATCH' : 'POST',
        body,
      });
      setForm(null);
      toast.success('Đã lưu việc');
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(t: AdminTask) {
    if (!confirm(`Xoá việc "${t.title}"?`)) return;
    await api(`/admin/plan/tasks/${t.id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          size="lg"
          onClick={() => {
            setError(null);
            setForm(emptyTask);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Thêm việc
        </Button>
      </div>

      <div className="grid gap-4">
        {GROUPS.filter((g) => grouped.get(g.key)?.length).map((g) => {
          const items = grouped.get(g.key)!;
          return (
            <Card key={g.key}>
              <CardHeader>
                <CardTitle
                  className={cn(g.key === 'overdue' && 'text-destructive')}
                >
                  {g.title}
                </CardTitle>
                <CardAction className="text-sm text-muted-foreground">
                  {items.length} việc
                </CardAction>
              </CardHeader>
              <CardContent className="grid">
                {items.map((t) => {
                  const done = pending[t.id] ?? !!t.doneAt;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-start gap-3 border-t py-2.5
                      first:border-t-0 first:pt-0`}
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={done}
                        aria-label={`Đánh dấu "${t.title}" đã xong`}
                        onCheckedChange={(v) => toggle(t, v)}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'font-medium',
                            done && 'text-muted-foreground line-through',
                          )}
                        >
                          {t.title}
                        </p>
                        <p
                          className={`flex flex-wrap items-center gap-x-2
                          gap-y-1 text-xs`}
                        >
                          <Badge variant="outline">
                            {PLAN_CATEGORY_LABEL[t.category]}
                          </Badge>
                          <DueLabel iso={t.dueDate} done={done} />
                          {t.assignee && (
                            <span className="text-muted-foreground">
                              · {SIDE_LABEL[t.assignee]}
                            </span>
                          )}
                          {t.expense && (
                            <span className="text-muted-foreground">
                              · Khoản chi: {t.expense.name}
                            </span>
                          )}
                        </p>
                        {t.note && (
                          <p
                            className={`mt-1 text-xs whitespace-pre-line
                            text-muted-foreground`}
                          >
                            {t.note}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Sửa"
                        onClick={() => {
                          setError(null);
                          setForm({
                            id: t.id,
                            title: t.title,
                            category: t.category,
                            dueDate: toDateInput(t.dueDate),
                            assignee: t.assignee ?? '',
                            expenseId: t.expense?.id ?? '',
                            note: t.note ?? '',
                          });
                        }}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        title="Xoá"
                        onClick={() => remove(t)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
        {!tasks.length && (
          <p className="text-muted-foreground">Chưa có việc nào.</p>
        )}
      </div>

      <FormDialog
        open={!!form}
        title={form?.id ? 'Sửa việc' : 'Thêm việc'}
        error={error}
        onClose={() => setForm(null)}
        onSubmit={save}
      >
        {form && (
          <>
            <FormField label="Việc cần làm">
              <Input
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                required
              />
            </FormField>
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
              <FormField label="Hạn">
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Người phụ trách">
                <NativeSelect
                  className="w-full"
                  value={form.assignee}
                  onChange={(e) =>
                    set({ assignee: e.target.value as Side | '' })
                  }
                >
                  <NativeSelectOption value="">Chưa giao</NativeSelectOption>
                  <NativeSelectOption value="GROOM">
                    Nhà trai
                  </NativeSelectOption>
                  <NativeSelectOption value="BRIDE">Nhà gái</NativeSelectOption>
                  <NativeSelectOption value="BOTH">Cả hai</NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField label="Gắn với khoản chi">
                <NativeSelect
                  className="w-full"
                  value={form.expenseId}
                  onChange={(e) => set({ expenseId: e.target.value })}
                >
                  <NativeSelectOption value="">—</NativeSelectOption>
                  {expenses.map((x) => (
                    <NativeSelectOption key={x.id} value={x.id}>
                      {x.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
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
    </>
  );
}
