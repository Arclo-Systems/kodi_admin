import { NextRequest, NextResponse } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

const PIECES = ['flashcards', 'summary', 'podcast'];
const ACTIONS = [
  'generate',
  'publish',
  'unpublish',
  'submit-review',
  'approve',
  'reject',
];

/**
 * Acciones por pieza (`/pieces/<piece>/<action>` acá → `/<piece>/<action>` en el
 * backend). El segmento `pieces` existe para que este handler dinámico no compita
 * con la carpeta estática `podcast/` del BFF: en el App Router el segmento estático
 * gana y no hay backtracking, así que `podcast/publish` nunca llegaría.
 *
 * `piece` y `action` se validan contra listas cerradas antes de armar la URL: el
 * proxy es fino, pero no reenvía cualquier cosa que venga por la ruta.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ topicId: string; piece: string; action: string }> },
) {
  const { topicId, piece, action } = await params;
  if (!PIECES.includes(piece) || !ACTIONS.includes(action)) {
    return NextResponse.json({ message: 'Acción de material desconocida' }, { status: 404 });
  }
  return forwardToBackend(
    req,
    'POST',
    `/v1/admin/content/review-material/topics/${topicId}/${piece}/${action}`,
  );
}
