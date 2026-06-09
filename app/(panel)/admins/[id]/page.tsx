import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HistoryIcon, MonitorIcon, PencilIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditTrail } from '@/components/admin/audit-trail';
import { adminFetch } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';
import { requireAction } from '@/lib/guard';
import { EditAdminForm, type AdminDetail } from './edit-form';
import { SessionsList } from './sessions-list';

export const metadata: Metadata = { title: 'Admin' };

export default async function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('admin:update');
  const { id } = await params;

  const res = await adminFetch(`/v1/admin/admins/${id}`);
  if (!res.ok) notFound();
  const admin = unwrapData<AdminDetail>(await res.json());
  if (!admin) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{admin.displayName}</h1>
        <p className="text-muted-foreground">{admin.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PencilIcon className="text-primary size-4" />
            Editar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditAdminForm admin={admin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorIcon className="text-info size-4" />
            Sesiones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SessionsList adminId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="text-primary size-4" />
            Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTrail resourceType="User" resourceId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
