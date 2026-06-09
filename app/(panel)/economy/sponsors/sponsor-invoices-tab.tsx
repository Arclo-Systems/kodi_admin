'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusIcon, ReceiptIcon } from 'lucide-react';
import { useSponsorInvoices, INVOICE_STATUS_LABELS } from '@/hooks/use-sponsor-invoices';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/lib/status-badge';
import { INVOICE_STATUS_FARO } from '@/lib/invoice-status';

const money = (n: number, currency: string) =>
  `${currency === 'USD' ? '$' : '₡'}${n.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;

export function SponsorInvoicesTab({ sponsorId }: { sponsorId: string }) {
  const router = useRouter();
  const { data: invoices, isLoading } = useSponsorInvoices({ sponsorId });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href={`/economy/sponsor-invoices/new?sponsorId=${sponsorId}`}>
            <PlusIcon className="size-4" />
            Nueva factura
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (invoices?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground text-sm">Sin facturas todavía.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {invoices!.map((inv) => (
            <li key={inv.id}>
              <button
                type="button"
                onClick={() => router.push(`/economy/sponsor-invoices/${inv.id}`)}
                className="hover:bg-muted/50 flex w-full items-center gap-3 p-3 text-left"
              >
                <ReceiptIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <span className="font-mono text-sm font-medium">{inv.number}</span>
                <StatusBadge
                  tone={INVOICE_STATUS_FARO[inv.status].tone}
                  icon={INVOICE_STATUS_FARO[inv.status].icon}
                  label={INVOICE_STATUS_LABELS[inv.status]}
                />
                <span className="text-muted-foreground ml-auto text-xs">
                  vence {new Date(inv.dueDate).toLocaleDateString('es-CR')}
                </span>
                <span className="font-medium">{money(inv.total, inv.currency)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
