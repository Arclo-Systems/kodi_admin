'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TwoFaDialog } from '@/components/admin/two-fa-dialog';
import { COUNTRIES } from '@/lib/countries';
import type { AdminRole } from '@/lib/auth';

export type AdminDetail = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  isGlobalScope: boolean;
  assignedCountries: string[];
};

const ROLES = ['admin', 'editor', 'support', 'commercial', 'user'] as const;

const EditAdminSchema = z.object({
  displayName: z.string().min(1, 'Requerido').max(80),
  role: z.enum(ROLES),
  scope: z.enum(['global', 'regional']),
  countries: z.array(z.string()),
});
type EditAdminValues = z.infer<typeof EditAdminSchema>;

export function EditAdminForm({ admin }: { admin: AdminDetail }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [twoFaOpen, setTwoFaOpen] = useState(false);
  const [pending, setPending] = useState<EditAdminValues | null>(null);

  const form = useForm<EditAdminValues>({
    resolver: zodResolver(EditAdminSchema),
    defaultValues: {
      displayName: admin.displayName,
      role: admin.role,
      scope: admin.isGlobalScope ? 'global' : 'regional',
      countries: admin.assignedCountries,
    },
  });
  const scope = form.watch('scope');

  function submit(values: EditAdminValues): void {
    if (values.scope === 'regional' && values.countries.length === 0) {
      form.setError('countries', { message: 'Selecciona al menos un país' });
      return;
    }
    // El backend exige 2FA en todo PATCH de admin → siempre confirmamos por 2FA.
    setPending(values);
    setTwoFaOpen(true);
  }

  async function sendPatch(values: EditAdminValues, twoFaToken: string): Promise<void> {
    const isGlobalScope = values.scope === 'global';
    const res = await fetch(`/api/admin/admins/${admin.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: values.displayName,
        role: values.role,
        isGlobalScope,
        ...(isGlobalScope ? {} : { assignedCountries: values.countries }),
        twoFaToken,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? 'Error actualizando admin');
    }
    toast.success('Admin actualizado');
    qc.invalidateQueries({ queryKey: ['admins'] });
    router.refresh();
  }

  return (
    <>
      <form onSubmit={form.handleSubmit(submit)}>
        <FieldGroup>
          <Controller
            name="displayName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="ea-name">Nombre</FieldLabel>
                <Input {...field} id="ea-name" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Rol</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>Cambiar el rol requiere 2FA por email.</FieldDescription>
                </Field>
              )}
            />
            <Controller
              name="scope"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Scope</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
          {scope === 'regional' && (
            <Controller
              name="countries"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Países</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {COUNTRIES.map((c) => (
                      <label key={c.code} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value.includes(c.code)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, c.code]
                                : field.value.filter((x) => x !== c.code),
                            )
                          }
                        />
                        {c.flag} {c.label}
                      </label>
                    ))}
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
          <div>
            <Button type="submit">Guardar</Button>
          </div>
        </FieldGroup>
      </form>

      <TwoFaDialog
        open={twoFaOpen}
        onOpenChange={setTwoFaOpen}
        action="update_admin"
        requestEndpoint={`/v1/admin/admins/${admin.id}/request-2fa`}
        onVerified={async (token) => {
          if (pending) await sendPatch(pending, token);
        }}
      />
    </>
  );
}
