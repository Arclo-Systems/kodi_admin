'use client';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export function DataTablePagination(props: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize));
  const from = (props.page - 1) * props.pageSize + 1;
  const to = Math.min(props.page * props.pageSize, props.total);

  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm">
        {props.total === 0 ? '0 resultados' : `${from}–${to} de ${props.total}`}
      </p>
      <div className="flex items-center gap-2">
        {props.onPageSizeChange && (
          <Select
            value={String(props.pageSize)}
            onValueChange={(v) => props.onPageSizeChange?.(parseInt(v, 10))}
          >
            <SelectTrigger className="w-20" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="icon"
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(1)}
          aria-label="Primera página"
        >
          <ChevronsLeftIcon className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(props.page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="w-16 text-center text-sm">
          {props.page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={props.page >= totalPages}
          onClick={() => props.onPageChange(props.page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={props.page >= totalPages}
          onClick={() => props.onPageChange(totalPages)}
          aria-label="Última página"
        >
          <ChevronsRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
