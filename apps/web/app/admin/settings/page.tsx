'use client';

import { useEffect, useState } from 'react';

import { PlusIcon, Trash2Icon } from 'lucide-react';

import type {
  BankAccountInput,
  BankAccountJson,
  Side,
  WeddingInfoInput,
  WeddingInfoJson,
} from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import {
  Card,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { Textarea } from '@repo/ui/components/textarea';

import { FieldRow, FormField } from '../../_components/common';
import { SIDE_LABEL, fromLocalInput, toLocalInput } from '../../_lib/format';
import { useAdminData, useAuth } from '../_lib/auth';
import { PageHeader } from '../_lib/ui';

const emptyInfo = {
  brideName: '',
  groomName: '',
  brideParents: '',
  groomParents: '',
  weddingDate: '',
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
  const [info, setInfo] = useState(emptyInfo);
  const [bank, setBank] = useState(emptyBank);

  useEffect(() => {
    if (wedding)
      setInfo({
        brideName: wedding.brideName,
        groomName: wedding.groomName,
        brideParents: wedding.brideParents ?? '',
        groomParents: wedding.groomParents ?? '',
        weddingDate: toLocalInput(wedding.weddingDate),
        story: wedding.story ?? '',
      });
  }, [wedding]);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    const body: WeddingInfoInput = {
      ...info,
      weddingDate: fromLocalInput(info.weddingDate) ?? '',
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
            <FormField label="Ngày cưới">
              <Input
                type="datetime-local"
                value={info.weddingDate}
                onChange={(e) => setI({ weddingDate: e.target.value })}
                required
              />
            </FormField>
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
