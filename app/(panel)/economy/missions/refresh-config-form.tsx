'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { SaveIcon, SettingsIcon } from 'lucide-react';
import { useRefreshConfig, useRefreshConfigMutation } from '@/hooks/use-missions';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';

const GLOBAL = '__global__';

type Values = { kokosCost: number; dailyLimit: number; videoLimit: number };

export function RefreshConfigDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SettingsIcon className="size-4" />
          Refresh config
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuración de cambio de misión</DialogTitle>
          <DialogDescription>
            Costo en Kokos y límites (diario / por video) para cambiar una misión, por país.
          </DialogDescription>
        </DialogHeader>
        <RefreshConfigBody onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RefreshConfigBody({ onClose }: { onClose: () => void }) {
  const [country, setCountry] = useState('');
  const { data: config, isLoading } = useRefreshConfig(country || null);
  const mutation = useRefreshConfigMutation();

  const form = useForm<Values>({
    values: {
      kokosCost: config?.kokosCost ?? 0,
      dailyLimit: config?.dailyLimit ?? 0,
      videoLimit: config?.videoLimit ?? 0,
    },
  });

  async function submit(v: Values): Promise<void> {
    try {
      await mutation.mutateAsync({ country: country || null, ...v });
      toast.success('Configuración guardada');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando la configuración');
    }
  }

  const numberField = (name: keyof Values, label: string, description: string) => (
    <Controller
      name={name}
      control={form.control}
      rules={{ min: { value: 0, message: '≥ 0' } }}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={`rc-${name}`}>{label}</FieldLabel>
          <Input
            id={`rc-${name}`}
            type="number"
            min={0}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          />
          <FieldDescription>{description}</FieldDescription>
        </Field>
      )}
    />
  );

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <Field>
        <FieldLabel>Ámbito</FieldLabel>
        <Select value={country || GLOBAL} onValueChange={(v) => setCountry(v === GLOBAL ? '' : v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GLOBAL}>Global (default)</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          Config por país; “Global” es el default cuando no hay una específica.
        </FieldDescription>
      </Field>

      {!isLoading && !config && (
        <p className="text-muted-foreground text-sm">
          No hay configuración para este ámbito; se creará al guardar.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {numberField('kokosCost', 'Costo en Kokos', 'Kokos para cambiar una misión.')}
        {numberField('dailyLimit', 'Límite diario gratis', 'Cambios gratis por día (con video ad).')}
        {numberField('videoLimit', 'Límite por video', 'Cambios pagables con video ad.')}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>
          <SaveIcon className="size-4" />
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}
