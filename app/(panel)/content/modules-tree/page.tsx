import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { ModulesTreeClient } from './modules-tree-client';

export const metadata = { title: 'Temas y módulos' };

export default async function ModulesTreePage() {
  const user = await requireAction('view:content');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Temas y módulos</h1>
        <p className="text-muted-foreground">
          Árbol de módulos, materias y temas. Arrastrá con el asa para reordenar.
        </p>
      </div>
      <ModulesTreeClient canWriteModules={can(user.role, 'content:module:write')} />
    </div>
  );
}
