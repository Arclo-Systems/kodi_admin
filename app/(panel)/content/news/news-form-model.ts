import { z } from 'zod';

// Tope de título alineado con lo que la app pinta sin "…". Las superficies más
// angostas son la fila de la lista (2 líneas de ~34 caracteres, Poppins Bold
// 13.5) y el héroe del detalle (3 líneas de ~23, Poppins Bold 24): ambas cortan
// alrededor de los 68 caracteres en 360dp — el titular del reporte del founder
// (68 visibles) ya salía con "…". 60 deja margen para palabras largas que
// desperdician renglón. El backend admite 200; este límite es el editorial.
export const NEWS_TITLE_MAX = 60;

export const NewsFormSchema = z.object({
  country: z.string().min(1),
  moduleId: z.string().min(1, 'Elegí a qué módulo va'),
  title: z
    .string()
    .trim()
    .min(1, 'Requerido')
    .max(
      NEWS_TITLE_MAX,
      `El título se cortaría en la app (máx. ${NEWS_TITLE_MAX} caracteres)`,
    ),
  summary: z.string().trim().min(1, 'Requerido').max(500, 'Máximo 500 caracteres'),
  body: z.string(),
  imageUrl: z.string().nullable(),
});

export type NewsFormValues = z.infer<typeof NewsFormSchema>;
