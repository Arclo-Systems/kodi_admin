import type {
  CutoffDegree,
  CutoffMatch,
  CutoffModality,
  SaveCutoffMatchItem,
} from '@/hooks/use-cutoffs';

/** Lo editable de una fila del emparejador; el resto del match es solo lectura. */
export type MatchDraft = {
  career: string;
  degrees: CutoffDegree[];
  emphases: string[];
  modality: CutoffModality | null;
  careerProfileId: string | null;
  /** Alternativa a `careerProfileId` (D10): crear la carrera desde el corte. */
  createCareer: { name: string; area?: string } | null;
};

export type MatchDrafts = Record<string, MatchDraft>;

// Misma clave que usa el backend para reconciliar (`matchKey` de cutoff-matches.ts).
export function matchKey(university: string, officialName: string): string {
  return `${university.trim().toUpperCase()} ${officialName.trim()}`;
}

export function toDraft(match: CutoffMatch): MatchDraft {
  return {
    career: match.career,
    degrees: [...match.degrees],
    emphases: [...match.emphases],
    modality: match.modality,
    careerProfileId: match.careerProfileId,
    createCareer: null,
  };
}

export function parseEmphases(raw: string): string[] {
  return raw
    .split('|')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function formatEmphases(emphases: readonly string[]): string {
  return emphases.join(' | ');
}

/** Pendiente = el emparejador todavía tiene que resolverlo (mismo criterio que el backend). */
export function countPendingMatches(matches: readonly CutoffMatch[]): number {
  return matches.filter((m) => !m.decided).length;
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function isDraftDirty(match: CutoffMatch, draft: MatchDraft): boolean {
  return (
    draft.createCareer !== null ||
    draft.career.trim() !== match.career ||
    draft.careerProfileId !== match.careerProfileId ||
    draft.modality !== match.modality ||
    !sameList(draft.degrees, match.degrees) ||
    !sameList(draft.emphases, match.emphases)
  );
}

/** Una fila solo es enviable si terminó apuntando a una carrera: no existe "sin carrera" (D10). */
export function isDraftSendable(draft: MatchDraft): boolean {
  return draft.createCareer !== null || draft.careerProfileId !== null;
}

/**
 * Body del PATCH: solo las filas tocadas que ya apuntan a una carrera. Las tocadas
 * sin carrera se quedan en la tabla (siguen pendientes) en vez de viajar a un 422.
 */
export function matchesToPatchItems(
  matches: readonly CutoffMatch[],
  drafts: MatchDrafts,
): SaveCutoffMatchItem[] {
  const items: SaveCutoffMatchItem[] = [];
  for (const match of matches) {
    const draft = drafts[matchKey(match.university, match.officialName)];
    if (!draft) continue;
    if (!isDraftDirty(match, draft) || !isDraftSendable(draft)) continue;
    items.push({
      university: match.university,
      officialName: match.officialName,
      career: draft.career.trim(),
      degrees: draft.degrees,
      emphases: draft.emphases,
      modality: draft.modality,
      ...careerTarget(draft),
    });
  }
  return items;
}

// El backend exige exactamente uno de los dos: carrera del catálogo o carrera nueva.
function careerTarget(
  draft: MatchDraft,
): Pick<SaveCutoffMatchItem, 'careerProfileId' | 'createCareer'> {
  const create = draft.createCareer;
  if (create) {
    const area = create.area?.trim();
    return { createCareer: { name: create.name.trim(), ...(area ? { area } : {}) } };
  }
  return { careerProfileId: draft.careerProfileId ?? undefined };
}
