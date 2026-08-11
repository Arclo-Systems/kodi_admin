import { notFound } from 'next/navigation';
import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { NodeEditorClient } from './node-editor-client';

export const metadata = { title: 'Editar contenido' };

const KINDS = ['module', 'subject', 'topic'] as const;
type Kind = (typeof KINDS)[number];

function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

/**
 * Editar y crear nodos del árbol de contenido. Vive en su propia pantalla y no
 * en un modal: el detalle ya eran ~790 líneas y con la identidad visual (color
 * más dos subidas de imagen con preview por nodo) no entraba en un diálogo.
 *
 * `id` acepta `new` para creación; el padre llega por query (`moduleId` para una
 * materia nueva, `subjectId` para un tema nuevo).
 */
export default async function ModulesTreeNodePage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ moduleId?: string; subjectId?: string }>;
}) {
  const user = await requireAction('view:content');
  const { kind, id } = await params;
  const { moduleId, subjectId } = await searchParams;

  if (!isKind(kind)) notFound();
  // Crear una materia sin módulo o un tema sin materia dejaría el formulario sin
  // padre al que colgarse y fallaría recién al guardar.
  if (id === 'new' && kind === 'subject' && !moduleId) notFound();
  if (id === 'new' && kind === 'topic' && !subjectId) notFound();

  return (
    <NodeEditorClient
      kind={kind}
      id={id}
      moduleId={moduleId}
      subjectId={subjectId}
      canWriteModules={can(user.role, 'content:module:write')}
      canWriteSubjects={can(user.role, 'content:subject:write')}
    />
  );
}
