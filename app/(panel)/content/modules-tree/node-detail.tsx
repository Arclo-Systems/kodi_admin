'use client';

import type { TreeModule } from '@/hooks/use-modules-tree';
import type { TreeView } from './node-shared';
import { ModuleForm } from './module-form';
import { SubjectForm } from './subject-form';
import { TopicForm } from './topic-form';

export type { TreeView } from './node-shared';

/**
 * Elige qué formulario mostrar según el nodo del árbol. Los tres viven en su
 * propio archivo: juntos eran ~1000 líneas, por encima del límite del estándar,
 * y el de módulo solo no comparte nada con los otros dos.
 */
export function NodeDetail({
  view,
  tree,
  canWriteModules,
  onDone,
}: {
  view: TreeView;
  tree: TreeModule[];
  canWriteModules: boolean;
  onDone: () => void;
}) {
  if (!view) return null;
  if (view.kind === 'module' || view.kind === 'new-module') {
    return (
      <ModuleForm
        view={view}
        tree={tree}
        canWriteModules={canWriteModules}
        onDone={onDone}
      />
    );
  }
  if (view.kind === 'subject' || view.kind === 'new-subject') {
    return <SubjectForm view={view} tree={tree} onDone={onDone} />;
  }
  return <TopicForm view={view} tree={tree} onDone={onDone} />;
}
