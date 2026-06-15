import { describe, it, expect } from 'vitest';
import type { TreeModule } from '@/hooks/use-modules-tree';
import { selectSubjects, selectTopicsBySubject, filterByName } from './ids-helpers';

const tree: TreeModule[] = [
  {
    id: 'm1',
    country: 'CR',
    shortName: 'PAA',
    fullName: 'Prueba',
    isActive: true,
    questionCount: 0,
    subjects: [
      {
        id: 's1',
        name: 'Matemática',
        order: 1,
        questionCount: 0,
        topics: [
          { id: 't1', name: 'Álgebra', order: 1, examWeight: null, questionCount: 0 },
          { id: 't2', name: 'Geometría', order: 2, examWeight: null, questionCount: 0 },
        ],
      },
    ],
  },
];

describe('selectSubjects', () => {
  it('devuelve id+name del módulo', () => {
    expect(selectSubjects(tree, 'm1')).toEqual([{ id: 's1', name: 'Matemática' }]);
  });
  it('vacío si el módulo no existe', () => {
    expect(selectSubjects(tree, 'x')).toEqual([]);
  });
});

describe('selectTopicsBySubject', () => {
  it('agrupa temas por materia', () => {
    expect(selectTopicsBySubject(tree, 'm1')).toEqual([
      {
        subject: 'Matemática',
        topics: [
          { id: 't1', name: 'Álgebra' },
          { id: 't2', name: 'Geometría' },
        ],
      },
    ]);
  });
});

describe('filterByName', () => {
  it('filtra sin distinguir mayúsculas', () => {
    expect(filterByName([{ name: 'Álgebra' }, { name: 'Geometría' }], 'geo')).toEqual([
      { name: 'Geometría' },
    ]);
  });
  it('sin query devuelve todo', () => {
    const items = [{ name: 'a' }, { name: 'b' }];
    expect(filterByName(items, '  ')).toBe(items);
  });
});
