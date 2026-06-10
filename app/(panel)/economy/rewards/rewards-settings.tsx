'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { RewardsConfigForm } from './rewards-config-form';

const ALL = 'ALL'; // Radix Select no admite value="" → sentinel para Default

export function RewardsSettings() {
  const [sel, setSel] = useState(ALL);
  const country = sel === ALL ? null : sel;

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Select value={sel} onValueChange={setSel}>
          <SelectTrigger aria-label="País de la configuración">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Default (todos los países)</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} · {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <RewardsConfigForm country={country} />
    </div>
  );
}
