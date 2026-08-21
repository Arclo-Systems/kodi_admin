import type { Metadata } from 'next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  // `reason=expired` lo ponen el vencimiento por inactividad y el middleware cuando el
  // refresh token ya no sirve: sin este aviso el admin vuelve al login sin saber por qué.
  const { reason } = await searchParams;

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4 md:max-w-4xl">
        {reason === 'expired' && (
          <Alert role="status">
            <AlertDescription>
              Tu sesión expiró por inactividad. Volvé a ingresar.
            </AlertDescription>
          </Alert>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
