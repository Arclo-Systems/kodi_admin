'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckIcon, CopyIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { unwrapData } from '@/lib/bff';

const CreateAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  displayName: z.string().min(1, 'Requerido').max(80),
  role: z.enum(['admin', 'editor', 'support', 'commercial']),
  scope: z.enum(['global', 'regional']),
  countries: z.array(z.string()),
});
type CreateAdminValues = z.infer<typeof CreateAdminSchema>;

export function CreateAdminDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<CreateAdminValues>({
    resolver: zodResolver(CreateAdminSchema),
    defaultValues: { email: '', displayName: '', scope: 'global', countries: [] },
  });
  const scope = form.watch('scope');

  async function onSubmit(values: CreateAdminValues): Promise<void> {
    const isGlobalScope = values.scope === 'global';
    const assignedCountries = isGlobalScope ? [] : values.countries;
    if (!isGlobalScope && assignedCountries.length === 0) {
      form.setError('countries', { message: 'Selecciona al menos un país' });
      return;
    }

    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: values.email,
        displayName: values.displayName,
        role: values.role,
        isGlobalScope,
        assignedCountries,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      toast.error(body.message ?? 'Error invitando admin');
      return;
    }

    const data = unwrapData<{ temporaryPassword: string }>(await res.json());
    setTemporaryPassword(data?.temporaryPassword ?? null);
    qc.invalidateQueries({ queryKey: ['admins'] });
  }

  async function copyPassword(): Promise<void> {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    toast.success('Contraseña copiada');
    setTimeout(() => setCopied(false), 2000);
  }

  function close(): void {
    onOpenChange(false);
    setTimeout(() => {
      setTemporaryPassword(null);
      form.reset();
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        {!temporaryPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitar admin</DialogTitle>
              <DialogDescription>
                Se generará una contraseña temporal. La verás una sola vez.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="ca-email">Email</FieldLabel>
                      <Input {...field} id="ca-email" type="email" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="displayName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="ca-name">Nombre</FieldLabel>
                      <Input {...field} id="ca-name" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    name="role"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Rol</FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">admin</SelectItem>
                            <SelectItem value="editor">editor</SelectItem>
                            <SelectItem value="support">support</SelectItem>
                            <SelectItem value="commercial">commercial</SelectItem>
                          </SelectContent>
                        </Select>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={close}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Invitando…' : 'Invitar'}
                  </Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Admin invitado ✅</DialogTitle>
              <DialogDescription>
                Copia esta contraseña temporal y envíala por un canal seguro.{' '}
                <strong>No se mostrará de nuevo.</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted flex items-center gap-2 rounded-md border p-3">
              <code className="flex-1 font-mono text-sm">{temporaryPassword}</code>
              <Button size="icon" variant="ghost" onClick={copyPassword} aria-label="Copiar">
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Expira en 7 días. El admin deberá cambiarla en su primer login.
            </p>
            <DialogFooter>
              <Button onClick={close}>Cerrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
