'use client';

import type { ModerationStatus } from '@repo/contracts';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/tabs';

import { MODERATION_LABEL } from '../../_lib/format';

export function ModerationTabs({
  value,
  onChange,
}: {
  value: '' | ModerationStatus;
  onChange: (v: '' | ModerationStatus) => void;
}) {
  return (
    <Tabs
      value={value || 'ALL'}
      onValueChange={(v) =>
        onChange(v === 'ALL' ? '' : (v as ModerationStatus))
      }
    >
      <TabsList>
        <TabsTrigger value="ALL">Tất cả</TabsTrigger>
        {Object.entries(MODERATION_LABEL).map(([v, l]) => (
          <TabsTrigger key={v} value={v}>
            {l}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
