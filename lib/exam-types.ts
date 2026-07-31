// Tipos de examen válidos. NO es una etiqueta cosmética: el backend lee el
// prefijo de este valor para decidir cómo calcula todo (`pne` → predicción por
// materia, `admision` → nota de admisión contra universidades, `cosevi` →
// examen simple). Un valor fuera de esta lista cae en "examen simple" sin
// avisar — así quedaron cuatro módulos mal clasificados en producción.
export const EXAM_TYPES = [
  'cosevi_auto',
  'cosevi_moto',
  'pne_primaria',
  'pne_bachillerato',
  'admision',
] as const;

export type ExamType = (typeof EXAM_TYPES)[number];

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  cosevi_auto: 'COSEVI Auto',
  cosevi_moto: 'COSEVI Moto',
  pne_primaria: 'PNE Primaria',
  pne_bachillerato: 'PNE Secundaria',
  admision: 'Admisión (PAA / TEC)',
};

/** Cómo se calcula el examen, según el prefijo — espejo de PredictorService.modeFor. */
export const EXAM_TYPE_HINTS: Record<ExamType, string> = {
  cosevi_auto: 'Examen simple: se aprueba o se reprueba.',
  cosevi_moto: 'Examen simple: se aprueba o se reprueba.',
  pne_primaria: 'Predicción materia por materia.',
  pne_bachillerato: 'Predicción materia por materia.',
  admision: 'Proyecta nota de admisión y compara contra universidades.',
};

export function isKnownExamType(value: string): value is ExamType {
  return (EXAM_TYPES as readonly string[]).includes(value);
}
