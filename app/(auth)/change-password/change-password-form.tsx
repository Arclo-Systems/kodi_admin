'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Control, Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: z
      .string()
      .min(10, 'Mínimo 10 caracteres')
      .regex(/[A-Z]/, 'Al menos una mayúscula')
      .regex(/[a-z]/, 'Al menos una minúscula')
      .regex(/[0-9]/, 'Al menos un número'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  });
type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;

function PasswordField({
  control,
  name,
  id,
  label,
  autoComplete,
  description,
}: {
  control: Control<ChangePasswordValues>;
  name: keyof ChangePasswordValues;
  id: string;
  label: string;
  autoComplete: string;
  description?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <div className="relative">
            <Input
              {...field}
              id={id}
              type={show ? 'text' : 'password'}
              autoComplete={autoComplete}
              aria-invalid={fieldState.invalid}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={show}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  async function onSubmit(values: ChangePasswordValues): Promise<void> {
    setServerError(null);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setServerError(body.message ?? 'No se pudo cambiar la contraseña');
      return;
    }

    toast.success('Contraseña actualizada');
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <PasswordField
          control={form.control}
          name="currentPassword"
          id="cp-current"
          label="Contraseña actual"
          autoComplete="current-password"
        />
        <PasswordField
          control={form.control}
          name="newPassword"
          id="cp-new"
          label="Nueva contraseña"
          autoComplete="new-password"
          description="Mínimo 10 caracteres, con mayúscula, minúscula y número."
        />
        <PasswordField
          control={form.control}
          name="confirm"
          id="cp-confirm"
          label="Confirmar nueva contraseña"
          autoComplete="new-password"
        />
        {serverError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Cambiando…' : 'Cambiar contraseña'}
        </Button>
      </FieldGroup>
    </form>
  );
}
