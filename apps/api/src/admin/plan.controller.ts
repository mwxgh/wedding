import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import {
  type AdminExpenseData,
  type AdminTaskData,
  type OkResponse,
  type PlanSummaryData,
  adminExpenseInclude,
  adminTaskInclude,
} from '@repo/contracts';
import type { ExpensePayment, PlanCategory } from '@repo/db';

import { AdminGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  BudgetDto,
  ExpenseDto,
  PaymentDto,
  TaskDto,
  UpdateExpenseDto,
  UpdateTaskDto,
} from './admin.dto';
import { TEMPLATE_EXPENSES, TEMPLATE_TASKS } from './plan-template';

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (v: string | null | undefined) =>
  v === undefined ? undefined : v === null ? null : new Date(v);

const toExpenseData = <T extends Partial<ExpenseDto>>(dto: T) => ({
  ...dto,
  estimated: dto.estimated === undefined ? undefined : BigInt(dto.estimated),
  dueDate: toDate(dto.dueDate),
});

const toTaskData = <T extends Partial<TaskDto>>({ done, ...dto }: T) => ({
  ...dto,
  dueDate: toDate(dto.dueDate),
  ...(done === undefined ? {} : { doneAt: done ? new Date() : null }),
});

/** Open tasks first by due date (undated last), done tasks at the end. */
const taskOrder = [
  { doneAt: { sort: 'asc', nulls: 'first' } },
  { dueDate: { sort: 'asc', nulls: 'last' } },
  { sortOrder: 'asc' },
] as const;

@Controller('admin/plan')
@UseGuards(AdminGuard)
export class PlanController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async summary(): Promise<PlanSummaryData> {
    // compare by calendar day in Vietnam time: due today is not overdue
    const today = new Date(
      `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}T00:00:00+07:00`,
    );
    const soon = new Date(today.getTime() + 15 * DAY_MS);
    const [wedding, expenses, total, done, overdue, dueSoon, upcoming] =
      await Promise.all([
        this.prisma.weddingInfo.findUnique({ where: { id: 1 } }),
        this.prisma.expense.findMany({ include: { payments: true } }),
        this.prisma.task.count(),
        this.prisma.task.count({ where: { doneAt: { not: null } } }),
        this.prisma.task.count({
          where: { doneAt: null, dueDate: { lt: today } },
        }),
        this.prisma.task.count({
          where: { doneAt: null, dueDate: { gte: today, lt: soon } },
        }),
        this.prisma.task.findMany({
          where: { doneAt: null },
          orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }],
          take: 6,
          include: adminTaskInclude,
        }),
      ]);

    const paidOf = (payments: ExpensePayment[]) =>
      payments.reduce((n, p) => n + p.amount, 0n);
    const categories = new Map<
      PlanCategory,
      { count: number; estimated: bigint; paid: bigint }
    >();
    for (const e of expenses) {
      const c = categories.get(e.category) ?? {
        count: 0,
        estimated: 0n,
        paid: 0n,
      };
      c.count += 1;
      c.estimated += e.estimated;
      c.paid += paidOf(e.payments);
      categories.set(e.category, c);
    }

    return {
      weddingDate: wedding?.weddingDate ?? null,
      budget: wedding?.budget ?? null,
      estimated: expenses.reduce((n, e) => n + e.estimated, 0n),
      paid: expenses.reduce((n, e) => n + paidOf(e.payments), 0n),
      byCategory: [...categories.entries()]
        .map(([category, c]) => ({ category, ...c }))
        .sort((a, b) => Number(b.estimated - a.estimated)),
      tasks: { total, done, overdue, dueSoon },
      upcoming,
    };
  }

  @Put('budget')
  async setBudget(@Body() dto: BudgetDto): Promise<OkResponse> {
    const budget = dto.budget === null ? null : BigInt(dto.budget);
    await this.prisma.weddingInfo.update({
      where: { id: 1 },
      data: { budget },
    });
    return { ok: true };
  }

  /** Adds the starter checklist and cost lines that are not there yet. */
  @Post('template')
  async template(): Promise<{ tasks: number; expenses: number }> {
    const wedding = await this.prisma.weddingInfo.findUnique({
      where: { id: 1 },
    });
    const [tasks, expenses] = await Promise.all([
      this.prisma.task.findMany({ select: { title: true } }),
      this.prisma.expense.findMany({ select: { name: true } }),
    ]);
    const hasTask = new Set(tasks.map((t) => t.title));
    const hasExpense = new Set(expenses.map((e) => e.name));

    const newTasks = TEMPLATE_TASKS.filter((t) => !hasTask.has(t.title));
    const newExpenses = TEMPLATE_EXPENSES.filter(
      (e) => !hasExpense.has(e.name),
    );
    await this.prisma.$transaction([
      this.prisma.task.createMany({
        data: newTasks.map((t, i) => ({
          title: t.title,
          category: t.category,
          assignee: t.assignee ?? null,
          sortOrder: i,
          dueDate: wedding
            ? new Date(
                wedding.weddingDate.getTime() - t.weeksBefore * 7 * DAY_MS,
              )
            : null,
        })),
      }),
      this.prisma.expense.createMany({
        data: newExpenses.map((e, i) => ({ ...e, sortOrder: i })),
      }),
    ]);
    return { tasks: newTasks.length, expenses: newExpenses.length };
  }

  /** Resets suggested (template) open tasks to their standard milestones. */
  @Post('reschedule')
  async reschedule(): Promise<{ rescheduled: number }> {
    const wedding = await this.prisma.weddingInfo.findUnique({
      where: { id: 1 },
    });
    if (!wedding) return { rescheduled: 0 };
    const weeks = new Map(TEMPLATE_TASKS.map((t) => [t.title, t.weeksBefore]));
    const open = await this.prisma.task.findMany({
      where: { doneAt: null, title: { in: [...weeks.keys()] } },
      select: { id: true, title: true },
    });
    await this.prisma.$transaction(
      open.map((t) =>
        this.prisma.task.update({
          where: { id: t.id },
          data: {
            dueDate: new Date(
              wedding.weddingDate.getTime() - weeks.get(t.title)! * 7 * DAY_MS,
            ),
          },
        }),
      ),
    );
    return { rescheduled: open.length };
  }

  // --- expenses

  @Get('expenses')
  expenses(): Promise<AdminExpenseData[]> {
    return this.prisma.expense.findMany({
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      include: adminExpenseInclude,
    });
  }

  @Post('expenses')
  createExpense(@Body() dto: ExpenseDto): Promise<AdminExpenseData> {
    return this.prisma.expense.create({
      data: { ...toExpenseData(dto), dueDate: toDate(dto.dueDate) ?? null },
      include: adminExpenseInclude,
    });
  }

  @Patch('expenses/:id')
  updateExpense(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<AdminExpenseData> {
    return this.prisma.expense.update({
      where: { id },
      data: toExpenseData(dto),
      include: adminExpenseInclude,
    });
  }

  @Delete('expenses/:id')
  async deleteExpense(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.expense.delete({ where: { id } });
    return { ok: true };
  }

  @Post('expenses/:id/payments')
  async addPayment(
    @Param('id') expenseId: string,
    @Body() dto: PaymentDto,
  ): Promise<OkResponse> {
    await this.prisma.expensePayment.create({
      data: {
        expenseId,
        amount: BigInt(dto.amount),
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        note: dto.note,
      },
    });
    return { ok: true };
  }

  @Delete('payments/:id')
  async deletePayment(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.expensePayment.delete({ where: { id } });
    return { ok: true };
  }

  // --- tasks

  @Get('tasks')
  tasks(): Promise<AdminTaskData[]> {
    return this.prisma.task.findMany({
      orderBy: [...taskOrder],
      include: adminTaskInclude,
    });
  }

  @Post('tasks')
  createTask(@Body() dto: TaskDto): Promise<AdminTaskData> {
    return this.prisma.task.create({
      data: toTaskData(dto),
      include: adminTaskInclude,
    });
  }

  @Patch('tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<AdminTaskData> {
    return this.prisma.task.update({
      where: { id },
      data: toTaskData(dto),
      include: adminTaskInclude,
    });
  }

  @Delete('tasks/:id')
  async deleteTask(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }
}
