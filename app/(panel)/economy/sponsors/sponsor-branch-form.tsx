'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { MapPinIcon, SaveIcon, StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import {
  useSponsor,
  useSponsorBranches,
  useSponsorBranchMutations,
  type SponsorBranchInput,
} from '@/hooks/use-sponsors';

const LeafletBranchPicker = dynamic(
  () => import('@/components/leaflet-branch-picker').then((m) => m.LeafletBranchPicker),
  { ssr: false, loading: () => <Skeleton className="h-[55vh] w-full" /> },
);

type FormState = {
  label: string;
  country: string;
  latitude: number;
  longitude: number;
  address: string;
  isActive: boolean;
};

export function SponsorBranchForm({ sponsorId, branchId }: { sponsorId: string; branchId?: string }) {
  const { data: sponsor, isLoading: loadingSponsor } = useSponsor(sponsorId);
  const { data: branches, isLoading: loadingBranches } = useSponsorBranches(sponsorId);

  if (loadingSponsor || (branchId && loadingBranches)) {
    return <Skeleton className="h-[70vh] w-full" />;
  }

  const editing = branchId ? branches?.find((b) => b.id === branchId) : undefined;
  if (branchId && !editing) {
    return <p className="text-muted-foreground text-sm">No se encontró la sucursal.</p>;
  }

  const initial: FormState = editing
    ? {
        label: editing.label,
        country: editing.country,
        latitude: editing.latitude,
        longitude: editing.longitude,
        address: editing.address ?? '',
        isActive: editing.isActive,
      }
    : {
        label: '',
        country: sponsor?.country ?? 'CR',
        latitude: 0,
        longitude: 0,
        address: '',
        isActive: true,
      };

  return <BranchFormInner sponsorId={sponsorId} branchId={branchId} initial={initial} />;
}

function BranchFormInner({
  sponsorId,
  branchId,
  initial,
}: {
  sponsorId: string;
  branchId?: string;
  initial: FormState;
}) {
  const router = useRouter();
  const { create, update } = useSponsorBranchMutations(sponsorId);
  const [form, setForm] = useState<FormState>(initial);
  const backHref = `/economy/sponsors/${sponsorId}`;

  async function save(): Promise<void> {
    if (!form.label.trim()) {
      toast.error('Poné un nombre de sucursal');
      return;
    }
    if (form.latitude === 0 && form.longitude === 0) {
      toast.error('Marcá la ubicación en el mapa');
      return;
    }
    const input: SponsorBranchInput = {
      label: form.label.trim(),
      country: form.country,
      latitude: form.latitude,
      longitude: form.longitude,
      address: form.address.trim() || null,
      isActive: form.isActive,
    };
    try {
      if (branchId) {
        await update.mutateAsync({ branchId, input });
        toast.success('Sucursal actualizada');
      } else {
        await create.mutateAsync(input);
        toast.success('Sucursal creada');
      }
      router.push(backHref);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-8">
          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <StoreIcon className="text-primary size-4" />
              Sucursal
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="br-label">Nombre</FieldLabel>
                <Input
                  id="br-label"
                  value={form.label}
                  maxLength={120}
                  placeholder="Multiplaza Escazú"
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel>País</FieldLabel>
                <Select
                  value={form.country}
                  onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="br-active">Estado</FieldLabel>
              <div className="flex items-center gap-2">
                <Switch
                  id="br-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <span className="text-sm">{form.isActive ? 'Activa' : 'Inactiva'}</span>
              </div>
            </Field>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <MapPinIcon className="text-primary size-4" />
              Ubicación
            </legend>

            <LeafletBranchPicker
              latitude={form.latitude}
              longitude={form.longitude}
              className="h-[55vh]"
              onPick={(lat, lng, address) =>
                setForm((f) => ({
                  ...f,
                  latitude: lat,
                  longitude: lng,
                  ...(address ? { address } : {}),
                }))
              }
            />
            <FieldDescription>
              Tocá el mapa para ubicar la sucursal (autocompleta la dirección).
            </FieldDescription>

            <Field>
              <FieldLabel htmlFor="br-addr">Dirección</FieldLabel>
              <Input
                id="br-addr"
                value={form.address}
                maxLength={200}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="br-lat">Latitud</FieldLabel>
                <Input
                  id="br-lat"
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: Number(e.target.value) }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="br-lng">Longitud</FieldLabel>
                <Input
                  id="br-lng"
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: Number(e.target.value) }))}
                />
              </Field>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={create.isPending || update.isPending}>
              <SaveIcon className="size-4" />
              {branchId ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
