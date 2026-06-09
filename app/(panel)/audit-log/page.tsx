import type { Metadata } from 'next';
import { requireAction } from '@/lib/guard';
import { AuditLogTable } from './audit-log-table';

export const metadata: Metadata = { title: 'Audit log' };

export default async function AuditLogPage() {
  await requireAction('view:audit-log');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-muted-foreground">Registro inmutable de acciones administrativas.</p>
      </div>
      <AuditLogTable />
    </div>
  );
}
