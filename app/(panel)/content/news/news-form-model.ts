import { z } from 'zod';
import { hasRawHtmlOutsideSvg } from '@/lib/raw-html';

// Tope de título alineado con lo que la app pinta sin "…". Las superficies más
// angostas son la fila de la lista (2 líneas de ~34 caracteres, Poppins Bold
// 13.5) y el héroe del detalle (3 líneas de ~23, Poppins Bold 24): ambas cortan
// alrededor de los 68 caracteres en 360dp — el titular del reporte del founder
// (68 visibles) ya salía con "…". 60 deja margen para palabras largas que
// desperdician renglón. El backend admite 200; este límite es el editorial.
export const NEWS_TITLE_MAX = 60;

export const NewsFormSchema = z.object({
  country: z.string().min(1),
  // Una noticia puede ir a varios módulos (el mismo cambio de formato le sirve a
  // más de un examen). Al menos uno: sin módulos no hay a quién mostrársela.
  moduleIds: z.array(z.string().min(1)).min(1, 'Elegí al menos un módulo'),
  title: z
    .string()
    .trim()
    .min(1, 'Requerido')
    .max(
      NEWS_TITLE_MAX,
      `El título se cortaría en la app (máx. ${NEWS_TITLE_MAX} caracteres)`,
    ),
  summary: z.string().trim().min(1, 'Requerido').max(500, 'Máximo 500 caracteres'),
  // La app dibuja el cuerpo con `MarkdownBlock`, que imprime el HTML LITERAL en
  // pantalla (`html:false`). El preview del panel lo sanea y no lo muestra, así
  // que sin este gate el autor guardaba un `<div>` creyendo que no pasaba nada y
  // al estudiante le llegaba el tag crudo. Mismo criterio que preguntas.
  body: z
    .string()
    .refine((v) => !hasRawHtmlOutsideSvg(v), {
      message:
        'El cuerpo no admite HTML: la app lo muestra tal cual, con los tags a la vista. Usá Markdown.',
    }),
  imageUrl: z.string().nullable(),
});

export type NewsFormValues = z.infer<typeof NewsFormSchema>;
