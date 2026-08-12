'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { MicIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { TableEmptyRow } from '@/components/admin/empty-state';
import {
  useCharacterVoiceMutations,
  useCharacterVoices,
  type CharacterVoice,
} from '@/hooks/use-review-material';

const FormSchema = z.object({
  key: z
    .string()
    .min(1, 'Obligatoria')
    .max(64)
    .regex(/^[a-z0-9_-]+$/, 'Solo minúsculas, números, guion y guion bajo'),
  displayName: z.string().min(1, 'Obligatorio').max(80),
  provider: z.string().max(64),
  voiceId: z.string().max(128),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof FormSchema>;

const EMPTY: FormValues = {
  key: '',
  displayName: '',
  provider: '',
  voiceId: '',
  isActive: true,
};

export function CharacterVoicesCard() {
  const { data, isLoading, isError } = useCharacterVoices();
  const { create, update, deactivate } = useCharacterVoiceMutations();
  const [editing, setEditing] = useState<CharacterVoice | null>(null);
  const [open, setOpen] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<CharacterVoice | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), values: EMPTY });

  function openFor(voice: CharacterVoice | null): void {
    setEditing(voice);
    form.reset(
      voice
        ? {
            key: voice.key,
            displayName: voice.displayName,
            provider: voice.provider ?? '',
            voiceId: voice.voiceId ?? '',
            isActive: voice.isActive,
          }
        : EMPTY,
    );
    setOpen(true);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    const input = {
      key: values.key,
      displayName: values.displayName,
      provider: values.provider.trim() || null,
      voiceId: values.voiceId.trim() || null,
      isActive: values.isActive,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...input });
        toast.success(`Personaje ${input.displayName} actualizado`);
      } else {
        await create.mutateAsync(input);
        toast.success(`Personaje ${input.displayName} creado`);
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el personaje');
    }
  }

  async function confirmDeactivate(): Promise<void> {
    if (!toDeactivate) return;
    try {
      await deactivate.mutateAsync(toDeactivate.id);
      toast.success(`${toDeactivate.displayName} queda fuera de los guiones nuevos`);
      setToDeactivate(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo dar de baja el personaje');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <MicIcon className="text-primary size-4" />
          Personajes y voces
        </CardTitle>
        <Button size="sm" onClick={() => openFor(null)}>
          <PlusIcon className="size-4" />
          Nuevo personaje
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          La voz del proveedor queda vacía hasta que se elija TTS: el catálogo se puede cargar
          igual y los guiones ya se escriben con estos personajes.
        </p>

        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>No se pudo cargar el catálogo de personajes.</AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personaje</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Voz</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).length === 0 && (
                  <TableEmptyRow
                    colSpan={6}
                    message="Sin personajes cargados"
                    description="Koko y los personajes regionales son las voces de los episodios."
                  />
                )}
                {(data ?? []).map((voice) => (
                  <TableRow key={voice.id}>
                    <TableCell className="font-medium">{voice.displayName}</TableCell>
                    <TableCell>
                      <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                        {voice.key}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{voice.provider ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{voice.voiceId ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={voice.isActive ? 'default' : 'outline'}>
                        {voice.isActive ? 'Activo' : 'De baja'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openFor(voice)}>
                        <PencilIcon className="size-4" />
                        Editar
                      </Button>
                      {voice.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setToDeactivate(voice)}
                        >
                          Dar de baja
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar personaje' : 'Nuevo personaje'}</DialogTitle>
            <DialogDescription>
              La clave es la que viaja dentro de los guiones; el nombre es lo que ve el equipo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} id="character-voice-form">
            <FieldGroup>
              <Controller
                name="displayName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="cv-name">Nombre</FieldLabel>
                    <Input id="cv-name" {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="key"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="cv-key">Clave</FieldLabel>
                    <Input
                      id="cv-key"
                      {...field}
                      disabled={editing !== null}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      {editing
                        ? 'No se cambia: ya está escrita en los guiones existentes.'
                        : 'Ej. koko. Minúsculas, números, guion y guion bajo.'}
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  name="provider"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="cv-provider">Proveedor</FieldLabel>
                      <Input id="cv-provider" {...field} placeholder="Sin definir" />
                    </Field>
                  )}
                />
                <Controller
                  name="voiceId"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="cv-voice">ID de voz</FieldLabel>
                      <Input id="cv-voice" {...field} placeholder="Sin definir" />
                    </Field>
                  )}
                />
              </div>
              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Switch
                      id="cv-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <FieldLabel htmlFor="cv-active">Disponible para guiones nuevos</FieldLabel>
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button
              type="submit"
              form="character-voice-form"
              disabled={create.isPending || update.isPending}
            >
              {editing ? 'Guardar cambios' : 'Crear personaje'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDeactivate !== null}
        onOpenChange={(next) => setToDeactivate(next ? toDeactivate : null)}
        title="Dar de baja el personaje"
        description="Deja de ofrecerse en guiones nuevos. Los episodios ya escritos lo conservan."
        destructive
        confirmLabel="Dar de baja"
        onConfirm={confirmDeactivate}
      />
    </Card>
  );
}
