'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PlusIcon, SaveIcon, ShuffleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/admin/empty-state';
import { WheelPreview, type WheelPreviewSector } from '@/components/admin/wheel-preview';
import { useContentTreeMutations } from '@/hooks/use-content-tree-mutations';
import { useModulesTree, type TreeModule } from '@/hooks/use-modules-tree';
import { useUpdateWheelConfig, useWheelConfig } from '@/hooks/use-wheel-config';
import { NodeFooter } from './node-shell';
import { NodeNotFound } from './node-shared';
import { WheelCrownEditor, type WheelCrownDraft } from './wheel-crown-editor';
import {
  WheelSectorEditor,
  WheelSectorSummary,
  type WheelSectorDraft,
} from './wheel-sector-editor';

type CatalogSector = { id: string; name: string } & WheelSectorDraft;

const SOURCE_LABEL: Record<TreeModule['duelCategorySource'], string> = {
  subjects: 'Materias',
  topics: 'Temas',
};

/**
 * La ruleta de Partida Kodi del módulo: réplica fiel a la izquierda y sus sectores editables a
 * la derecha. Los sectores no tienen campos ni endpoints nuevos — el color y el arte son los de
 * la materia o el tema, y se guardan donde siempre. La corona sí es aparte: config global del
 * juego, admin-only y con su propio guardado.
 */
export function WheelTab({
  moduleId,
  canWrite,
  canEditCrown,
  onGoToModuleForm,
}: {
  moduleId: string;
  canWrite: boolean;
  canEditCrown: boolean;
  onGoToModuleForm: () => void;
}) {
  const { data: tree, isLoading, isError, error, refetch } = useModulesTree();
  const m = useContentTreeMutations();
  const { data: crownConfig, isLoading: crownLoading } = useWheelConfig(canEditCrown);
  const updateCrown = useUpdateWheelConfig();
  const [draft, setDraft] = useState<Record<string, WheelSectorDraft>>({});
  const [crownDraft, setCrownDraft] = useState<WheelCrownDraft | null>(null);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 xl:flex-row">
        <Skeleton className="size-70 shrink-0 rounded-full" />
        <div className="w-full space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="max-w-lg space-y-3 p-6 text-center">
        <p className="text-sm font-medium">No se pudo cargar la ruleta</p>
        <p className="text-muted-foreground text-sm">
          {(error as Error)?.message ?? 'Intentá de nuevo en un momento.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </Card>
    );
  }

  const mod = (tree ?? []).find((x) => x.id === moduleId);
  if (!mod) return <NodeNotFound tipo="El módulo" />;

  const source = mod.duelCategorySource;
  const catalog = catalogOf(mod);
  const valueOf = (sector: CatalogSector): WheelSectorDraft =>
    draft[sector.id] ?? { colorHex: sector.colorHex, wheelAssetUrl: sector.wheelAssetUrl };

  const dirty = catalog.filter((sector) => {
    const v = valueOf(sector);
    return v.colorHex !== sector.colorHex || v.wheelAssetUrl !== sector.wheelAssetUrl;
  });

  const preview: WheelPreviewSector[] = catalog.map((sector) => {
    const v = valueOf(sector);
    return { id: sector.id, name: sector.name, color: v.colorHex, assetUrl: v.wheelAssetUrl };
  });

  const savedCrown: WheelCrownDraft = {
    assetUrl: crownConfig?.crownAssetUrl ?? null,
    colorHex: crownConfig?.crownColorHex ?? null,
  };
  const crown = crownDraft ?? savedCrown;
  const crownDirty =
    crown.assetUrl !== savedCrown.assetUrl || crown.colorHex !== savedCrown.colorHex;

  async function saveCrown(): Promise<void> {
    try {
      // El PUT reemplaza la config entera: se mandan siempre los dos campos, y el vacío es
      // "quitar lo cargado".
      await updateCrown.mutateAsync({
        crownAssetUrl: crown.assetUrl?.trim() || null,
        crownColorHex: crown.colorHex?.trim() || null,
      });
      setCrownDraft(null);
      toast.success('Corona actualizada');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await Promise.all(dirty.map((sector) => persist(sector, valueOf(sector))));
      setDraft({});
      toast.success(
        dirty.length === 1 ? 'Sector actualizado' : `${dirty.length} sectores actualizados`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function persist(sector: CatalogSector, next: WheelSectorDraft): Promise<void> {
    if (source === 'topics') {
      // Vaciar el color le devuelve al tema su falta de identidad propia: la ruleta cae a su
      // color de respaldo por posición. Mismo criterio que el formulario del tema.
      await m.updateTopic.mutateAsync({
        id: sector.id,
        colorHex: next.colorHex || null,
        wheelAssetUrl: next.wheelAssetUrl,
      });
      return;
    }
    // La materia siempre tiene color: si el campo quedó vacío no se manda y conserva el suyo.
    await m.updateSubject.mutateAsync({
      id: sector.id,
      ...(next.colorHex ? { colorHex: next.colorHex } : {}),
      wheelAssetUrl: next.wheelAssetUrl,
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <WheelPreview sectors={preview} crown={crown} cap={mod.duelCategoryCap} />

          <p className="text-muted-foreground flex max-w-70 gap-2 text-xs">
            <ShuffleIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              En la partida el orden se baraja: acá se ve el orden del catálogo. Si hay más
              sectores que el tope, cada partida elige cuáles entran.
            </span>
          </p>

          <div className="max-w-70 space-y-1 border-t pt-4 text-xs">
            <p className="text-muted-foreground">
              Se arma con{' '}
              <span className="text-foreground font-medium">
                {SOURCE_LABEL[source].toLowerCase()}
              </span>
              , máximo{' '}
              <span className="text-foreground font-medium">{mod.duelCategoryCap}</span> sectores.
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={onGoToModuleForm}
            >
              Cambiarlo en la pestaña Módulo
            </Button>
          </div>
        </div>

        <div className="w-full space-y-4">
          <div>
            <p className="text-sm font-medium">
              Sectores · {SOURCE_LABEL[source]}
            </p>
            <p className="text-muted-foreground text-xs">
              El color y el arte son los de cada {source === 'topics' ? 'tema' : 'materia'}: lo
              que se guarde acá se ve igual en su formulario.
            </p>
          </div>

          {catalog.length === 0 ? (
            <div className="space-y-3">
              <EmptyState
                message={
                  source === 'topics'
                    ? 'Este módulo todavía no tiene temas'
                    : 'Este módulo todavía no tiene materias'
                }
                description="Sin sectores la ruleta queda solo con la corona y la Partida Kodi no se puede jugar."
              />
              {canWrite && source === 'subjects' && (
                <div className="flex justify-center">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/content/modules-tree/subject/new?moduleId=${mod.id}`}>
                      <PlusIcon className="size-4" />
                      Crear la primera materia
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {catalog.map((sector) =>
                canWrite ? (
                  <WheelSectorEditor
                    key={sector.id}
                    name={sector.name}
                    value={valueOf(sector)}
                    onChange={(next) => setDraft((d) => ({ ...d, [sector.id]: next }))}
                  />
                ) : (
                  <WheelSectorSummary
                    key={sector.id}
                    name={sector.name}
                    value={valueOf(sector)}
                  />
                ),
              )}
            </div>
          )}

          {canEditCrown && (
            <WheelCrownEditor
              value={crown}
              loading={crownLoading}
              dirty={crownDirty}
              saving={updateCrown.isPending}
              onChange={setCrownDraft}
              onDiscard={() => setCrownDraft(null)}
              onSave={() => void saveCrown()}
            />
          )}
        </div>
      </div>

      {canWrite && catalog.length > 0 && (
        <NodeFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={dirty.length === 0 || saving}
            onClick={() => setDraft({})}
          >
            Descartar cambios
          </Button>
          <Button type="button" disabled={dirty.length === 0 || saving} onClick={() => void save()}>
            <SaveIcon className="size-4" />
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </NodeFooter>
      )}
    </div>
  );
}

/**
 * Los sectores tal como los arma la partida: temas de todo el módulo o materias, según
 * `duelCategorySource` (espejo de `buildMatchCategories` en el backend).
 */
function catalogOf(mod: TreeModule): CatalogSector[] {
  if (mod.duelCategorySource === 'topics') {
    return mod.subjects.flatMap((s) =>
      s.topics.map((t) => ({
        id: t.id,
        name: t.name,
        colorHex: t.colorHex,
        wheelAssetUrl: t.wheelAssetUrl,
      })),
    );
  }
  return mod.subjects.map((s) => ({
    id: s.id,
    name: s.name,
    colorHex: s.colorHex,
    wheelAssetUrl: s.wheelAssetUrl,
  }));
}
