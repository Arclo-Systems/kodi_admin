import { describe, it, expect } from 'vitest';
import type { QuestionListQuery } from '@/hooks/use-questions';
import {
  DEFAULT_QUESTION_LIST_QUERY,
  hasActiveQuestionFilters,
  parseQuestionListQuery,
  serializeQuestionListQuery,
} from './question-list-query-url';

const parse = (qs: string) => parseQuestionListQuery(new URLSearchParams(qs));

describe('parseQuestionListQuery', () => {
  it('sin params devuelve el default', () => {
    expect(parse('')).toEqual({
      search: undefined,
      moduleId: undefined,
      subjectId: undefined,
      topicId: undefined,
      status: undefined,
      difficulty: undefined,
      isDemoPool: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it('lee todos los filtros', () => {
    expect(parse('search=raíz&moduleId=m1&subjectId=s1&topicId=t1&status=review&difficulty=hard&isDemoPool=true&page=3&pageSize=50')).toEqual({
      search: 'raíz',
      moduleId: 'm1',
      subjectId: 's1',
      topicId: 't1',
      status: 'review',
      difficulty: 'hard',
      isDemoPool: true,
      page: 3,
      pageSize: 50,
    });
  });

  it('descarta estado y dificultad desconocidos', () => {
    const q = parse('status=zzz&difficulty=imposible');
    expect(q.status).toBeUndefined();
    expect(q.difficulty).toBeUndefined();
  });

  it('descarta paginación no positiva o no numérica', () => {
    expect(parse('page=0&pageSize=abc')).toMatchObject({ page: 1, pageSize: 20 });
    expect(parse('page=-2&pageSize=1.5')).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('ignora materia y tema huérfanos', () => {
    expect(parse('subjectId=s1&topicId=t1')).toMatchObject({
      subjectId: undefined,
      topicId: undefined,
    });
    expect(parse('moduleId=m1&topicId=t1')).toMatchObject({
      moduleId: 'm1',
      subjectId: undefined,
      topicId: undefined,
    });
  });

  it('trata el texto en blanco como sin filtro', () => {
    expect(parse('search=%20%20').search).toBeUndefined();
  });

  it('isDemoPool solo acepta true/false', () => {
    expect(parse('isDemoPool=true').isDemoPool).toBe(true);
    expect(parse('isDemoPool=false').isDemoPool).toBe(false);
    expect(parse('isDemoPool=1').isDemoPool).toBeUndefined();
  });
});

describe('serializeQuestionListQuery', () => {
  it('el default no ensucia la URL', () => {
    expect(serializeQuestionListQuery(DEFAULT_QUESTION_LIST_QUERY)).toBe('');
  });

  it('omite la paginación por defecto', () => {
    expect(serializeQuestionListQuery({ ...DEFAULT_QUESTION_LIST_QUERY, status: 'draft' })).toBe(
      'status=draft',
    );
  });

  it('serializa isDemoPool=false (no es lo mismo que sin filtro)', () => {
    expect(
      serializeQuestionListQuery({ ...DEFAULT_QUESTION_LIST_QUERY, isDemoPool: false }),
    ).toBe('isDemoPool=false');
  });

  it('no arrastra materia ni tema sin su padre', () => {
    expect(
      serializeQuestionListQuery({
        ...DEFAULT_QUESTION_LIST_QUERY,
        subjectId: 's1',
        topicId: 't1',
      }),
    ).toBe('');
  });
});

describe('ida y vuelta', () => {
  it('parse(serialize(q)) === q', () => {
    const query: QuestionListQuery = {
      search: 'ecuación',
      moduleId: 'm1',
      subjectId: 's1',
      topicId: 't1',
      status: 'active',
      difficulty: 'easy',
      isDemoPool: false,
      page: 4,
      pageSize: 50,
    };
    expect(parse(serializeQuestionListQuery(query))).toEqual(query);
  });
});

describe('hasActiveQuestionFilters', () => {
  it('el default no tiene filtros', () => {
    expect(hasActiveQuestionFilters(DEFAULT_QUESTION_LIST_QUERY)).toBe(false);
  });

  it('paginar no es filtrar', () => {
    expect(hasActiveQuestionFilters({ page: 3, pageSize: 50 })).toBe(false);
  });

  it('cualquier filtro lo activa', () => {
    expect(hasActiveQuestionFilters({ ...DEFAULT_QUESTION_LIST_QUERY, status: 'draft' })).toBe(true);
    expect(hasActiveQuestionFilters({ ...DEFAULT_QUESTION_LIST_QUERY, isDemoPool: false })).toBe(
      true,
    );
    expect(hasActiveQuestionFilters({ ...DEFAULT_QUESTION_LIST_QUERY, search: '  ' })).toBe(false);
  });
});
