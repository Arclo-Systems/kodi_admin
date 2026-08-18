// La app dibuja Markdown con `html: false`: un `<br>` o un `<span>` le llegan al estudiante como
// texto literal, mientras el preview del panel los borra en silencio (`rehype-sanitize`). El
// preview miente, así que el guardado rechaza el HTML crudo en vez de dejar pasar la divergencia.
// Los fences ```svg y ```mermaid quedan fuera: ahí el XML/DSL es el contenido, no maquetado.
const RICH_FENCE = /```(?:svg|mermaid)[^\n]*\n[\s\S]*?```/g;
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/;

export const RAW_HTML_MESSAGE =
  'El HTML no se muestra en la app. Usá Markdown: **negrita**, *cursiva*, listas con - o una tabla.';

export function hasRawHtmlOutsideSvg(md: string): boolean {
  return HTML_TAG.test(md.replace(RICH_FENCE, ''));
}
