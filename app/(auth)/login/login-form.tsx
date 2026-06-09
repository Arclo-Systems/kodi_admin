'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { unwrapData } from '@/lib/bff';

const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});
type LoginValues = z.infer<typeof LoginSchema>;

// Layout shadcn login-04 (dos columnas: form + portada), sin login social ni registro.
export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showResetHint, setShowResetHint] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginValues): Promise<void> {
    setServerError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setServerError(body.message ?? 'Credenciales inválidas');
        return;
      }

      const result = unwrapData<{ requirePasswordChange?: boolean }>(await res.json());
      router.push(result?.requirePasswordChange ? '/change-password' : '/');
      router.refresh();
    } catch {
      setServerError('No pudimos conectar. Revisá tu conexión e intentá de nuevo.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="animate-rise overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <Image
                  src="/logo.svg"
                  alt="Kodi"
                  width={150}
                  height={49}
                  className="h-12 w-auto"
                  unoptimized
                  priority
                />
                <h1 className="sr-only">Iniciar sesión en Kodi</h1>
                <p className="text-muted-foreground text-balance">Ingresá tus credenciales para continuar</p>
              </div>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="login-email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="login-email"
                      type="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                      {/* No hay flujo de auto-recuperación; el reinicio lo hace un admin. */}
                      <button
                        type="button"
                        onClick={() => setShowResetHint(true)}
                        className="text-muted-foreground hover:text-foreground ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <Input
                      {...field}
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    {showResetHint && (
                      <FieldDescription>
                        Pedí a otro administrador que reinicie tu contraseña desde el panel.
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />
              {serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}
              <Field>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
                </Button>
              </Field>
              <FieldDescription className="text-center text-xs">
                Hecho por{' '}
                <a
                  href="https://www.arclosystems.com/es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground font-medium underline-offset-4 hover:underline"
                >
                  Arclo Systems
                </a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/portada.webp"
              alt=""
              fill
              sizes="(min-width: 896px) 448px, (min-width: 768px) 50vw, 0px"
              quality={90}
              className="object-cover"
              priority
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Acceso restringido · Uso interno y confidencial de{' '}
        <a
          href="https://appkodi.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground font-medium underline-offset-4 hover:underline"
        >
          Kodi
        </a>
      </FieldDescription>
    </div>
  );
}
