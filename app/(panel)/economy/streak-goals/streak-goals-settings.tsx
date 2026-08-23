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
import { StreakGoalsForm } from './streak-goals-form';

const ALL = 'ALL'; // Radix Select no admite value="" → sentinel para Default

export function StreakGoalsSettings() {
  const [sel, setSel] = useState(ALL);
  const country = sel === ALL ? null : sel;

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Select value={sel} onValueChange={setSel}>
          <SelectTrigger aria-label="País de la escala">
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
      <StreakGoalsForm key={sel} country={country} />
    </div>
  );
}
