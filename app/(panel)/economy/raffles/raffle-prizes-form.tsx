'use client';

import { useState } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import {
  useRaffleActions,
  type RaffleDetail,
  type RafflePrizeInput,
} from '@/hooks/use-raffles';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/** Fila en edición. La imagen es opcional y hereda la de la premiación. */
type Row = { position: number; description: string; imageUrl: string };

function initialRows(raffle: RaffleDetail): Row[] {
  if (raffle.prizes.length > 0) {
    return raffle.prizes.map((p) => ({
      position: p.position,
      description: p.description,
      imageUrl: p.imageUrl ?? '',
    }));
  }
  // Sin premios por puesto cargados, se propone uno por puesto con el premio
  // general: es exactamente lo que la app está mostrando hoy.
  return Array.from({ length: raffle.prizesCount }, (_, i) => ({
    position: i + 1,
    description: raffle.prizeDescription,
    imageUrl: raffle.prizeImageUrl ?? '',
  }));
}

export function RafflePrizesForm({ raffle }: { raffle: RaffleDetail }) {
  const { setPrizes } = useRaffleActions(raffle.id);
  const [rows, setRows] = useState<Row[]>(() => initialRows(raffle));

  const update = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const add = () => {
    const nextPosition = rows.reduce((max, r) => Math.max(max, r.position), 0) + 1;
    setRows((prev) => [...prev, { position: nextPosition, description: '', imageUrl: '' }]);
  };

  const remove = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const save = () => {
    const positions = rows.map((r) => r.position);
    if (new Set(positions).size !== positions.length) {
      toast.error('Hay más de un premio para el mismo puesto.');
      return;
    }
    if (rows.some((r) => !r.description.trim())) {
      toast.error('Todos los puestos necesitan una descripción.');
      return;
    }

    const payload: RafflePrizeInput[] = rows.map((r) => ({
      position: r.position,
      description: r.description.trim(),
      image_url: r.imageUrl.trim() || null,
    }));

    setPrizes.mutate(payload, {
      onSuccess: () => toast.success('Premios actualizados'),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="flex items-end gap-3">
            <Field className="w-20 shrink-0">
              <FieldLabel htmlFor={`position-${index}`}>Puesto</FieldLabel>
              <Input
                id={`position-${index}`}
                type="number"
                min={1}
                value={row.position}
                onChange={(e) => update(index, { position: Number(e.target.value) })}
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor={`description-${index}`}>Premio</FieldLabel>
              <Input
                id={`description-${index}`}
                value={row.description}
                placeholder="Ej. Laptop Lenovo IdeaPad"
                onChange={(e) => update(index, { description: e.target.value })}
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor={`image-${index}`}>Imagen (opcional)</FieldLabel>
              <Input
                id={`image-${index}`}
                value={row.imageUrl}
                placeholder="https://…"
                onChange={(e) => update(index, { imageUrl: e.target.value })}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive mb-1"
              aria-label={`Quitar el premio del puesto ${row.position}`}
              onClick={() => remove(index)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <PlusIcon className="size-4" />
          Agregar puesto
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={setPrizes.isPending}>
          {setPrizes.isPending ? 'Guardando…' : 'Guardar premios'}
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        Los puestos sin premio propio muestran el premio general de la premiación.
      </p>
    </div>
  );
}
