'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useStoreMutations } from '@/hooks/use-store-monetization';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = z.object({
  userId: z.string().regex(UUID, 'Tiene que ser un UUID de usuario'),
  moduleIds: z
    .string()
    .trim()
    .min(1, 'Al menos un módulo')
    .refine(
      (value) => splitIds(value).every((id) => UUID.test(id)),
      'Cada módulo tiene que ser un UUID, separados por coma',
    ),
  reason: z.string().trim().min(5, 'El motivo queda en el audit log: escribí al menos 5 caracteres'),
});

type FormValues = z.infer<typeof schema>;

function splitIds(value: string): string[] {
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Asignación manual de módulos sobre una incidencia `pending_module_selection`.
 *
 * Corre por el mismo camino que el sheet de la app, así que hereda sus reglas: la
 * cantidad tiene que coincidir con el pack COBRADO y los módulos tienen que ser
 * del usuario. Puede fallar con `PURCHASE_TOKEN_UNRECOVERABLE`: el recibo no se
 * guarda, y si la compra nunca escribió filas no hay de dónde sacarlo — en ese
 * caso la salida es que el usuario elija desde la app.
 */
export function AssignModulesDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { assignModules } = useStoreMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: '', moduleIds: '', reason: '' },
  });

  async function onSubmit(values: FormValues): Promise<void> {
    setError(null);
    try {
      await assignModules.mutateAsync({
        id: eventId,
        userId: values.userId,
        moduleIds: splitIds(values.moduleIds),
        reason: values.reason,
      });
      toast.success('Módulos asignados');
      form.reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos asignar los módulos');
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Asignar módulos
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar módulos a mano</DialogTitle>
            <DialogDescription>
              La cantidad tiene que coincidir con el pack cobrado y los módulos tienen que estar
              registrados por el usuario.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Field>
              <FieldLabel htmlFor="assign-user">Usuario</FieldLabel>
              <Input id="assign-user" placeholder="UUID del usuario" {...form.register('userId')} />
              <FieldError errors={[form.formState.errors.userId]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="assign-modules">Módulos</FieldLabel>
              <Input
                id="assign-modules"
                placeholder="UUID, UUID, UUID"
                {...form.register('moduleIds')}
              />
              <FieldDescription>Separados por coma, en el orden que quieras.</FieldDescription>
              <FieldError errors={[form.formState.errors.moduleIds]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="assign-reason">Motivo</FieldLabel>
              <Textarea id="assign-reason" rows={2} {...form.register('reason')} />
              <FieldError errors={[form.formState.errors.reason]} />
            </Field>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Asignar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
