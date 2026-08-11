'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, Disc3Icon, SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useModulesTree, type TreeModule } from '@/hooks/use-modules-tree';
import { NodeDetail, type TreeView } from '../../node-detail';
import { NodeChrome } from '../../node-shell';
import { WheelTab } from '../../wheel-tab';

const TREE_PATH = '/content/modules-tree';
const MODULE_TAB = 'modulo';

// El padre de un nodo existente se deriva del árbol en vez de confiar en la
// query: hoy los formularios solo lo usan al crear, pero dejarlo vacío al editar
// es una trampa para quien lo lea después.
function parentOf(
  tree: TreeModule[],
  kind: 'subject' | 'topic',
  id: string,
): string {
  for (const m of tree) {
    if (kind === 'subject' && m.subjects.some((s) => s.id === id)) return m.id;
    for (const s of m.subjects) {
      if (kind === 'topic' && s.topics.some((t) => t.id === id)) return s.id;
    }
  }
  return '';
}

function toView(
  tree: TreeModule[],
  kind: 'module' | 'subject' | 'topic',
  id: string,
  moduleId?: string,
  subjectId?: string,
): TreeView {
  if (id === 'new') {
    if (kind === 'module') return { kind: 'new-module' };
    if (kind === 'subject') return { kind: 'new-subject', moduleId: moduleId ?? '' };
    return { kind: 'new-topic', subjectId: subjectId ?? '' };
  }
  if (kind === 'module') return { kind: 'module', id };
  if (kind === 'subject') {
    return { kind: 'subject', id, moduleId: moduleId ?? parentOf(tree, 'subject', id) };
  }
  return { kind: 'topic', id, subjectId: subjectId ?? parentOf(tree, 'topic', id) };
}

export function NodeEditorClient({
  kind,
  id,
  moduleId,
  subjectId,
  canWriteModules,
  canWriteSubjects,
  canEditCrown,
}: {
  kind: 'module' | 'subject' | 'topic';
  id: string;
  moduleId?: string;
  subjectId?: string;
  canWriteModules: boolean;
  canWriteSubjects: boolean;
  /** La corona es config global del juego: solo admin, aunque la pestaña la vea un editor. */
  canEditCrown: boolean;
}) {
  const router = useRouter();
  const { data: tree, isLoading, isError, error, refetch } = useModulesTree();
  const [tab, setTab] = useState(MODULE_TAB);

  // El árbol es la única fuente de datos del panel: no hay GET de detalle por
  // nodo, así que el formulario no puede precargarse hasta que llegue.
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Sin esto, un fallo al traer el árbol caía en el formulario con `tree = []`:
  // el de módulo quedaba en blanco y los de materia y tema decían "ya no existe",
  // que para un error de red es mentira.
  if (isError) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={TREE_PATH}>
            <ArrowLeftIcon className="size-4" />
            Volver al árbol
          </Link>
        </Button>
        <Card className="max-w-lg space-y-3 p-6 text-center">
          <p className="text-sm font-medium">No se pudo cargar el contenido</p>
          <p className="text-muted-foreground text-sm">
            {(error as Error)?.message ?? 'Intentá de nuevo en un momento.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  const view = toView(tree ?? [], kind, id, moduleId, subjectId);
  const detail = (
    <NodeDetail
      view={view}
      tree={tree ?? []}
      canWriteModules={canWriteModules}
      onDone={() => router.push(TREE_PATH)}
    />
  );

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={TREE_PATH}>
          <ArrowLeftIcon className="size-4" />
          Volver al árbol
        </Link>
      </Button>

      {/* Ancho completo: son tres bloques (identidad, configuración y arte) y con
          ancho de modal el arte quedaba apilado abajo con media pantalla vacía. */}
      <Card className="p-6">
        <NodeChrome variant="screen">
          {/* La ruleta es del módulo pero no se edita con sus campos: sus sectores son las
              materias o los temas. Por eso va en pestaña propia y no como otro bloque del
              formulario, que ya es largo. Solo con el módulo creado: sin id no hay sectores. */}
          {view?.kind === 'module' ? (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value={MODULE_TAB}>
                  <SettingsIcon />
                  Módulo
                </TabsTrigger>
                <TabsTrigger value="ruleta">
                  <Disc3Icon />
                  Ruleta
                </TabsTrigger>
              </TabsList>
              <TabsContent value={MODULE_TAB} className="pt-4">
                {detail}
              </TabsContent>
              <TabsContent value="ruleta" className="pt-4">
                <WheelTab
                  moduleId={view.id}
                  canWrite={canWriteSubjects}
                  canEditCrown={canEditCrown}
                  onGoToModuleForm={() => setTab(MODULE_TAB)}
                />
              </TabsContent>
            </Tabs>
          ) : (
            detail
          )}
        </NodeChrome>
      </Card>
    </div>
  );
}
