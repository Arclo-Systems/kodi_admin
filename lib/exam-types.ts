// CÓMO se califica un examen. Universal: cualquier país tiene exámenes de estos
// tres tipos, se llamen como se llamen. De acá cuelgan predictor y estadísticas.
//
// Antes esto se deducía leyendo el prefijo del NOMBRE del examen (`pne…`,
// `admision…`, `cosevi…`). Dos problemas: entró texto libre sin validar
// ("fewf", "pen") y cuatro módulos quedaron calculando mal en silencio; y al
// cerrarlo con la lista de nombres de Costa Rica se volvía imposible dar de
// alta el examen de otro país.
export const EXAM_MODES = ['simple', 'per_subject', 'admission'] as const;

export type ExamMode = (typeof EXAM_MODES)[number];

export const EXAM_MODE_LABELS: Record<ExamMode, string> = {
  simple: 'Se aprueba o se reprueba',
  per_subject: 'Por materia',
  admission: 'Admisión',
};

export const EXAM_MODE_HINTS: Record<ExamMode, string> = {
  simple: 'Una nota mínima decide si pasa. Ej: COSEVI.',
  per_subject: 'Cada materia es su propio examen y se predice aparte. Ej: PNE.',
  admission:
    'No se aprueba: se compite por cupo y se proyecta contra universidades. Ej: PAA, TEC.',
};

/** Exámenes del formulario público de Becas — identifican QUÉ eligió el solicitante. */
export const SCHOLARSHIP_EXAM_LABELS: Record<string, string> = {
  cosevi_auto: 'COSEVI Auto',
  cosevi_moto: 'COSEVI Moto',
  pne_primaria: 'PNE Primaria',
  pne_bachillerato: 'PNE Secundaria',
  admision: 'Admisión',
};
