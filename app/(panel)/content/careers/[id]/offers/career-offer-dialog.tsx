'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUniversities } from '@/hooks/use-universities';
import {
  OFFER_MODALITIES,
  OFFER_MODALITY_LABEL,
  useCareerOfferMutations,
  type CareerOffer,
  type OfferModality,
} from '@/hooks/use-career-offers';
import {
  EMPTY_OFFER_FORM,
  NO_MODALITY,
  toCreateOfferInput,
  toOfferFormValues,
  toUpdateOfferInput,
  validateOfferForm,
  type OfferFormValues,
} from './career-offers-model';

export function CareerOfferDialog({
  careerId,
  country,
  offer,
  takenUniversityIds,
  open,
  onOpenChange,
}: {
  careerId: string;
  country: string;
  offer: CareerOffer | null;
  takenUniversityIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = useCareerOfferMutations(careerId);
  const [values, setValues] = useState<OfferFormValues>(
    offer ? toOfferFormValues(offer) : EMPTY_OFFER_FORM,
  );

  // Solo privadas activas del país de la carrera: el backend rechaza cualquier otra.
  const { data: page, isLoading } = useUniversities({
    country,
    type: 'private',
    isActive: true,
    page: 1,
    pageSize: 100,
  });
  // Una universidad no puede tener dos ofertas para la misma carrera (@@unique):
  // se ocultan las ya usadas para no ofrecer un 409 seguro.
  const options = (page?.items ?? []).filter(
    (u) => u.id === values.universityId || !takenUniversityIds.includes(u.id),
  );

  const set = (patch: Partial<OfferFormValues>) => setValues({ ...values, ...patch });

  async function submit(): Promise<void> {
    const error = validateOfferForm(values);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      if (offer) {
        await update.mutateAsync({ id: offer.id, input: toUpdateOfferInput(values) });
        toast.success('Oferta actualizada');
      } else {
        await create.mutateAsync(toCreateOfferInput(values));
        toast.success('Oferta creada');
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la oferta');
    }
  }

  const text = (
    name: 'durationText' | 'scheduleText' | 'costText' | 'campuses' | 'url',
    label: string,
    placeholder: string,
    desc?: string,
  ) => (
    <Field>
      <FieldLabel htmlFor={`offer-${name}`}>{label}</FieldLabel>
      <Input
        id={`offer-${name}`}
        value={values[name]}
        placeholder={placeholder}
        onChange={(e) => set({ [name]: e.target.value } as Partial<OfferFormValues>)}
      />
      {desc && <FieldDescription>{desc}</FieldDescription>}
    </Field>
  );

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{offer ? 'Editar oferta' : 'Nueva oferta'}</DialogTitle>
          <DialogDescription>
            Ficha que la app muestra en el bottom sheet de la universidad. Los campos vacíos no se
            muestran.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
          <Field>
            <FieldLabel>Universidad privada</FieldLabel>
            <Select
              value={values.universityId}
              onValueChange={(v) => set({ universityId: v })}
              disabled={Boolean(offer) || isLoading}
            >
              <SelectTrigger aria-label="Universidad privada">
                <SelectValue placeholder={isLoading ? 'Cargando…' : 'Elegí la universidad'} />
              </SelectTrigger>
              <SelectContent>
                {options.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.code} · {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {offer
                ? 'No editable: para cambiar de universidad, eliminá esta oferta y creá otra.'
                : `Privadas activas de ${country}. Si no aparece, creala en Contenido → Universidades con tipo Privada.`}
            </FieldDescription>
          </Field>

          {text(
            'campuses',
            'Sedes',
            'San José | Heredia',
            'Separadas con «|». Se muestran bajo el nombre de la universidad.',
          )}

          <Field>
            <FieldLabel>Modalidad</FieldLabel>
            <Select
              value={values.modality}
              onValueChange={(v) =>
                set({ modality: v === NO_MODALITY ? NO_MODALITY : (v as OfferModality) })
              }
            >
              <SelectTrigger aria-label="Modalidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MODALITY}>Sin especificar</SelectItem>
                {OFFER_MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {OFFER_MODALITY_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {text('durationText', 'Duración', '4 años')}
            {text('scheduleText', 'Horario', 'Nocturno')}
          </div>
          {text('costText', 'Costo aproximado', '₡180.000 por cuatrimestre')}

          <Field>
            <FieldLabel htmlFor="offer-note">Nota</FieldLabel>
            <Textarea
              id="offer-note"
              value={values.note}
              rows={3}
              placeholder="Beca por promedio, convenio…"
              onChange={(e) => set({ note: e.target.value })}
            />
          </Field>

          {text(
            'url',
            'Enlace',
            'https://…',
            'Obligatorio y https. Es el destino del botón «Ir al sitio»; podés incluir UTM.',
          )}

          <Field>
            <FieldLabel htmlFor="offer-active">Estado</FieldLabel>
            <div className="flex items-center gap-2">
              <Switch
                id="offer-active"
                checked={values.isActive}
                onCheckedChange={(v) => set({ isActive: v })}
              />
              <span className="text-sm">{values.isActive ? 'Activa' : 'Inactiva'}</span>
            </div>
            <FieldDescription>Solo las activas aparecen en la app.</FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            <SaveIcon className="size-4" />
            {pending ? 'Guardando…' : offer ? 'Guardar cambios' : 'Crear oferta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
