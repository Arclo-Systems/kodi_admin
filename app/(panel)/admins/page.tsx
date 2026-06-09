import type { Metadata } from 'next';
import { requireAction } from '@/lib/guard';
import { AdminsTable } from './admins-table';

export const metadata: Metadata = { title: 'Admins' };

export default async function AdminsPage() {
  await requireAction('admin:list');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admins</h1>
        <p className="text-muted-foreground">Gestiona los administradores del panel</p>
      </div>
      <AdminsTable />
    </div>
  );
}
