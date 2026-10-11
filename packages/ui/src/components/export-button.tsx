'use client';

import { useState } from 'react';

import { DownloadIcon, LoaderIcon } from 'lucide-react';

import { type AnyExcelSheet, downloadExcel, excelFileName } from '../lib/excel';
import { Button } from './button';
import { toast } from './sonner';

/**
 * Downloads the given sheets as one .xlsx. `sheets` is called on click, so
 * it always exports the data currently on screen.
 */
export function ExportButton({
  fileName,
  sheets,
  label = 'Xuất Excel',
  disabled,
  size = 'lg',
}: {
  /** Base name; a slug and today's date are appended. */
  fileName: string;
  sheets: () => AnyExcelSheet[];
  label?: string;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg';
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await downloadExcel(excelFileName(fileName), sheets());
    } catch (err) {
      toast.error(`Không xuất được file: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={run}
      disabled={disabled || busy}
    >
      {busy ? (
        <LoaderIcon data-icon="inline-start" className="animate-spin" />
      ) : (
        <DownloadIcon data-icon="inline-start" />
      )}
      {label}
    </Button>
  );
}
