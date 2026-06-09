import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { KeyRoundIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAdmin } from '@/lib/auth';
import { ChangePasswordForm } from './change-password-form';

export const metadata: Metadata = { title: 'Cambiar contraseña' };

export default async function ChangePasswordPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect('/login');

  return (
    <div className="bg-muted flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="animate-rise">
          <CardHeader className="justify-items-center text-center">
            <Image
              src="/logo.svg"
              alt="Kodi"
              width={150}
              height={49}
              className="mb-1 h-10 w-auto"
              unoptimized
              priority
            />
            <CardTitle className="flex items-center justify-center gap-2">
              <KeyRoundIcon className="text-primary size-5" />
              Cambiar contraseña
            </CardTitle>
            <CardDescription>Establecé una nueva contraseña antes de continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
