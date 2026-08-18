import { describe, expect, it } from 'vitest';
import type { CutoffMatch } from '@/hooks/use-cutoffs';
import {
  countPendingMatches,
  formatEmphases,
  isDraftDirty,
  matchKey,
  matchesToPatchItems,
  parseEmphases,
  toDraft,
  type MatchDrafts,
} from './cutoffs-matches-model';

function match(over: Partial<CutoffMatch> = {}): CutoffMatch {
  return {
    university: 'UCR',
    officialName: 'DIPL. ADM. ADUANERA',
    sourceCode: '330212',
    career: 'Administración Aduanera',
    degrees: ['diplomado'],
    emphases: [],
    modality: null,
    careerProfileId: null,
    status: 'suggested',
    confidence: 0.8,
    candidates: [{ id: 'c-1', name: 'Administración Aduanera', score: 0.88 }],
    rowCount: 3,
    decided: false,
    ...over,
  };
}

function drafts(list: readonly CutoffMatch[]): MatchDrafts {
  return Object.fromEntries(list.map((m) => [matchKey(m.university, m.officialName), toDraft(m)]));
}

describe('emparejador de cortes — conteo de pendientes', () => {
  it('cuenta solo los que el panel todavía tiene que resolver', () => {
    const list = [
      match({ officialName: 'A', status: 'alias', decided: true }),
      match({ officialName: 'B', status: 'auto', decided: true }),
      match({ officialName: 'C', status: 'suggested', decided: false }),
      match({ officialName: 'D', status: 'unmatched', decided: false }),
    ];
    expect(countPendingMatches(list)).toBe(2);
  });

  it('sin pendientes falsos: alias y auto no exigen click', () => {
    const list = [
      match({ officialName: 'A', status: 'alias', decided: true }),
      match({ officialName: 'B', status: 'auto', decided: true }),
    ];
    expect(countPendingMatches(list)).toBe(0);
  });
});

describe('emparejador de cortes — body del PATCH', () => {
  it('no manda nada si nadie tocó una fila', () => {
    const list = [match({ careerProfileId: 'c-1', status: 'auto', decided: true })];
    expect(matchesToPatchItems(list, drafts(list))).toEqual([]);
  });

  it('manda solo las filas tocadas', () => {
    const tocada = match({ officialName: 'A' });
    const intacta = match({ officialName: 'B', careerProfileId: 'c-2', decided: true });
    const list = [tocada, intacta];
    const d = drafts(list);
    d[matchKey('UCR', 'A')]!.careerProfileId = 'c-1';

    const items = matchesToPatchItems(list, d);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ officialName: 'A', careerProfileId: 'c-1' });
  });

  it('editar una fila ya decidida (alias/auto) la manda igual', () => {
    const list = [match({ careerProfileId: 'c-1', status: 'alias', decided: true })];
    const d = drafts(list);
    d[matchKey(list[0]!.university, list[0]!.officialName)]!.emphases = ['Piano'];

    expect(matchesToPatchItems(list, d)[0]).toMatchObject({
      careerProfileId: 'c-1',
      emphases: ['Piano'],
    });
  });

  it('createCareer viaja sin careerProfileId (el backend exige exactamente uno)', () => {
    const list = [match()];
    const d = drafts(list);
    d[matchKey(list[0]!.university, list[0]!.officialName)]!.createCareer = {
      name: 'Administración Aduanera',
      area: 'Ciencias Sociales',
    };

    const item = matchesToPatchItems(list, d)[0]!;
    expect(item.createCareer).toEqual({
      name: 'Administración Aduanera',
      area: 'Ciencias Sociales',
    });
    expect(item.careerProfileId).toBeUndefined();
  });

  it('una fila tocada sin carrera no viaja: no existe "sin carrera" (D10)', () => {
    const list = [match()];
    const d = drafts(list);
    d[matchKey(list[0]!.university, list[0]!.officialName)]!.career = 'Otro nombre';

    expect(matchesToPatchItems(list, d)).toEqual([]);
  });

  it('el nombre limpio viaja sin espacios sobrantes', () => {
    const list = [match({ careerProfileId: 'c-1', decided: true })];
    const d = drafts(list);
    d[matchKey(list[0]!.university, list[0]!.officialName)]!.career = '  Adm. Aduanera  ';

    expect(matchesToPatchItems(list, d)[0]!.career).toBe('Adm. Aduanera');
  });
});

describe('emparejador de cortes — edición', () => {
  it('el borrador arranca igual al match y no está sucio', () => {
    const m = match({ careerProfileId: 'c-1', emphases: ['Piano'], decided: true });
    expect(isDraftDirty(m, toDraft(m))).toBe(false);
  });

  it('detecta cambios de grado, modalidad y carrera', () => {
    const m = match({ careerProfileId: 'c-1', decided: true });
    expect(isDraftDirty(m, { ...toDraft(m), degrees: ['bachillerato'] })).toBe(true);
    expect(isDraftDirty(m, { ...toDraft(m), modality: 'nocturna' })).toBe(true);
    expect(isDraftDirty(m, { ...toDraft(m), careerProfileId: 'c-9' })).toBe(true);
  });

  it('los énfasis se escriben separados por "|"', () => {
    expect(parseEmphases(' Piano | Violín |  ')).toEqual(['Piano', 'Violín']);
    expect(parseEmphases('')).toEqual([]);
    expect(formatEmphases(['Piano', 'Violín'])).toBe('Piano | Violín');
    expect(parseEmphases(formatEmphases(['Piano', 'Violín']))).toEqual(['Piano', 'Violín']);
  });

  it('la clave del grupo ignora mayúsculas de la universidad y espacios del nombre', () => {
    expect(matchKey(' ucr ', ' MÚSICA ')).toBe(matchKey('UCR', 'MÚSICA'));
  });
});
