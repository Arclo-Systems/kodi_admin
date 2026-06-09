'use client';

import { FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COUNTRIES, type CountryCode } from '@/lib/countries';

export type CountryFilterProps = {
  value: CountryCode[];
  onChange: (value: CountryCode[]) => void;
  // Lista efectiva: global → todos los códigos; regional → su scope.
  allowedCountries: string[];
};

export function CountryFilter(props: CountryFilterProps) {
  const allowed = props.allowedCountries as CountryCode[];

  function toggle(code: CountryCode): void {
    if (props.value.includes(code)) {
      props.onChange(props.value.filter((c) => c !== code));
    } else {
      props.onChange([...props.value, code]);
    }
  }

  const label =
    props.value.length === 0
      ? 'Todos los países'
      : props.value.length === 1
        ? (COUNTRIES.find((c) => c.code === props.value[0])?.label ?? props.value[0])
        : `${props.value.length} países`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FilterIcon className="size-3" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="space-y-2">
          {COUNTRIES.filter((c) => allowed.includes(c.code)).map((c) => (
            <label key={c.code} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={props.value.includes(c.code)}
                onCheckedChange={() => toggle(c.code)}
              />
              <span>
                {c.flag} {c.label}
              </span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
