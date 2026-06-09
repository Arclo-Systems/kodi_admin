'use client';

import { XIcon } from 'lucide-react';
import { CountryFilter } from '@/components/admin/country-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserListQuery } from '@/hooks/use-users';
import type { CountryCode } from '@/lib/countries';

export type UsersFiltersProps = {
  value: UserListQuery;
  onChange: (q: UserListQuery) => void;
  allowedCountries: string[];
};

export function UsersFilters(props: UsersFiltersProps) {
  function patch(p: Partial<UserListQuery>): void {
    props.onChange({ ...props.value, ...p, page: 1 });
  }

  const hasAnyFilter =
    !!props.value.search ||
    (props.value.country?.length ?? 0) > 0 ||
    !!props.value.plan ||
    !!props.value.accountStatus ||
    props.value.isBot !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Email, username, friendCode o ID…"
        value={props.value.search ?? ''}
        onChange={(e) => patch({ search: e.target.value })}
        className="h-8 w-64"
      />
      <CountryFilter
        value={(props.value.country ?? []) as CountryCode[]}
        onChange={(v) => patch({ country: v })}
        allowedCountries={props.allowedCountries}
      />
      <Select
        value={props.value.plan}
        onValueChange={(v) => patch({ plan: v as UserListQuery['plan'] })}
      >
        <SelectTrigger className="w-32" size="sm">
          <SelectValue placeholder="Plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="basico">Básico</SelectItem>
          <SelectItem value="plus">Plus</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={props.value.accountStatus}
        onValueChange={(v) => patch({ accountStatus: v })}
      >
        <SelectTrigger className="w-36" size="sm">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="suspended">Suspendido</SelectItem>
          <SelectItem value="pending_parental">Pendiente parental</SelectItem>
          <SelectItem value="deleted">Eliminado</SelectItem>
        </SelectContent>
      </Select>
      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            props.onChange({
              page: 1,
              pageSize: props.value.pageSize,
              sortBy: 'createdAt',
              sortDir: 'desc',
            })
          }
        >
          <XIcon className="size-3" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
