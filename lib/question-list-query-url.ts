import type { Difficulty, QuestionListQuery, QuestionStatus } from '@/hooks/use-questions';

export const DEFAULT_QUESTION_LIST_QUERY: QuestionListQuery = { page: 1, pageSize: 20 };

const STATUSES: readonly QuestionStatus[] = ['draft', 'review', 'active', 'inactive'];
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

function readText(raw: string | null): string | undefined {
  const value = raw?.trim();
  return value ? value : undefined;
}

function readOneOf<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((option) => option === raw);
}

function readBoolean(raw: string | null): boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

function readPositiveInt(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return raw !== null && Number.isInteger(value) && value > 0 ? value : fallback;
}

export function parseQuestionListQuery(params: URLSearchParams): QuestionListQuery {
  const moduleId = readText(params.get('moduleId'));
  const subjectId = moduleId ? readText(params.get('subjectId')) : undefined;

  return {
    search: readText(params.get('search')),
    moduleId,
    subjectId,
    // Materia y tema solo existen dentro de su padre: sin él, el select ni se
    // dibuja y el filtro quedaría fantasma (URL editada a mano o link viejo).
    topicId: subjectId ? readText(params.get('topicId')) : undefined,
    status: readOneOf(params.get('status'), STATUSES),
    difficulty: readOneOf(params.get('difficulty'), DIFFICULTIES),
    isDemoPool: readBoolean(params.get('isDemoPool')),
    page: readPositiveInt(params.get('page'), DEFAULT_QUESTION_LIST_QUERY.page),
    pageSize: readPositiveInt(params.get('pageSize'), DEFAULT_QUESTION_LIST_QUERY.pageSize),
  };
}

export function serializeQuestionListQuery(query: QuestionListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | undefined) => {
    if (value) params.set(key, value);
  };

  const subjectId = query.moduleId ? query.subjectId : undefined;

  set('search', query.search?.trim() || undefined);
  set('moduleId', query.moduleId);
  set('subjectId', subjectId);
  set('topicId', subjectId ? query.topicId : undefined);
  set('status', query.status);
  set('difficulty', query.difficulty);
  if (query.isDemoPool !== undefined) params.set('isDemoPool', String(query.isDemoPool));
  if (query.page !== DEFAULT_QUESTION_LIST_QUERY.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULT_QUESTION_LIST_QUERY.pageSize) {
    params.set('pageSize', String(query.pageSize));
  }

  return params.toString();
}

export function hasActiveQuestionFilters(query: QuestionListQuery): boolean {
  return (
    !!query.search?.trim() ||
    !!query.moduleId ||
    !!query.subjectId ||
    !!query.topicId ||
    !!query.status ||
    !!query.difficulty ||
    query.isDemoPool !== undefined
  );
}
