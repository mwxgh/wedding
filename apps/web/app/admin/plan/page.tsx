'use client';

import { useCallback, useState } from 'react';

import { CalendarClockIcon, SparklesIcon } from 'lucide-react';

import type {
  AdminExpense,
  AdminTask,
  BudgetInput,
  PlanSummary,
} from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import { ExportButton } from '@repo/ui/components/export-button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { toast } from '@repo/ui/components/sonner';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/tabs';

import { FormField } from '../../_components/common';
import { useAdminData, useAuth } from '../_lib/auth';
import { planSheets } from '../_lib/exports';
import { ErrorAlert, FormDialog, PageHeader } from '../_lib/ui';
import { ExpensesTab, MoneyInput } from './_components/expenses';
import { PlanOverview } from './_components/overview';
import { TasksTab } from './_components/tasks';

export default function PlanPage() {
  const { api } = useAuth();
  const summary = useAdminData<PlanSummary>('/admin/plan/summary');
  const expenses = useAdminData<AdminExpense[]>('/admin/plan/expenses');
  const tasks = useAdminData<AdminTask[]>('/admin/plan/tasks');
  const [budget, setBudget] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // every change can move the totals, so refresh the summary too
  const { reload: reloadSummary } = summary;
  const { reload: reloadExpenses } = expenses;
  const { reload: reloadTasks } = tasks;
  const reloadAll = useCallback(async () => {
    await Promise.all([reloadSummary(), reloadExpenses(), reloadTasks()]);
  }, [reloadSummary, reloadExpenses, reloadTasks]);

  async function seedTemplate() {
    setSeeding(true);
    try {
      const res = await api<{ tasks: number; expenses: number }>(
        '/admin/plan/template',
        { method: 'POST' },
      );
      toast.success(
        res.tasks || res.expenses
          ? `Đã thêm ${res.tasks} việc và ${res.expenses} khoản chi gợi ý`
          : 'Danh sách gợi ý đã có đủ',
      );
      await reloadAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  async function reschedule() {
    if (
      !confirm(
        'Đặt lại hạn các việc gợi ý chưa xong theo đúng mốc so với ngày cưới? Hạn bạn tự sửa cho các việc đó sẽ bị thay.',
      )
    )
      return;
    try {
      const res = await api<{ rescheduled: number }>('/admin/plan/reschedule', {
        method: 'POST',
      });
      toast.success(`Đã tính lại hạn ${res.rescheduled} việc`);
      await reloadAll();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    const body: BudgetInput = { budget: budget ? Number(budget) : null };
    try {
      await api('/admin/plan/budget', { method: 'PUT', body });
      setBudget(null);
      toast.success('Đã cập nhật ngân sách');
      await reloadSummary();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const error = summary.error ?? expenses.error ?? tasks.error;
  const ready = summary.data && expenses.data && tasks.data;

  return (
    <>
      <PageHeader
        title="Kế hoạch"
        actions={
          <>
            <Button variant="outline" onClick={reschedule}>
              <CalendarClockIcon data-icon="inline-start" />
              Tính lại hạn theo ngày cưới
            </Button>
            <Button variant="outline" onClick={seedTemplate} disabled={seeding}>
              <SparklesIcon data-icon="inline-start" />
              Tạo danh sách gợi ý
            </Button>
            <ExportButton
              size="default"
              fileName="Ke hoach cuoi"
              disabled={!ready}
              sheets={() =>
                planSheets(summary.data!, expenses.data!, tasks.data!)
              }
            />
          </>
        }
      />
      <ErrorAlert error={error} />
      {!ready && !error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      )}
      {ready && (
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="expenses">
              Khoản chi ({expenses.data!.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Việc cần làm ({summary.data!.tasks.done}/
              {summary.data!.tasks.total})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <PlanOverview
              summary={summary.data!}
              onEditBudget={() =>
                setBudget(
                  summary.data!.budget && Number(summary.data!.budget)
                    ? summary.data!.budget
                    : '',
                )
              }
            />
          </TabsContent>
          <TabsContent value="expenses">
            <ExpensesTab expenses={expenses.data!} reload={reloadAll} />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksTab
              tasks={tasks.data!}
              expenses={expenses.data!}
              reload={reloadAll}
            />
          </TabsContent>
        </Tabs>
      )}

      <FormDialog
        open={budget !== null}
        title="Ngân sách đám cưới"
        onClose={() => setBudget(null)}
        onSubmit={saveBudget}
      >
        <FormField label="Tổng ngân sách (VND) — để trống nếu chưa đặt">
          <MoneyInput value={budget ?? ''} onChange={setBudget} />
        </FormField>
      </FormDialog>
    </>
  );
}
