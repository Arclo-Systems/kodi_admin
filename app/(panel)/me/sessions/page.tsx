import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MonitorIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCurrentAdmin } from '@/lib/auth';
import { SessionsList } from '@/app/(panel)/admins/[id]/sessions-list';
import { RevokeAllSessionsButton } from '@/app/(panel)/admins/[id]/revoke-all-sessions-button';

export const metadata: Metadata = { title: 'Mis sesiones' };

export default async function MySessionsPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mis sesiones</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorIcon className="text-info size-4" />
            Sesiones activas
          </CardTitle>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardDescription>
              Revocá cualquier sesión que no reconozcas. Tu sesión actual aparece como activa.
            </CardDescription>
            <RevokeAllSessionsButton />
          </div>
        </CardHeader>
        <CardContent>
          <SessionsList adminId={user.id} self />
        </CardContent>
      </Card>
    </div>
  );
}
