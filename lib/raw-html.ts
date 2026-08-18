// La app dibuja Markdown con `html: false`: un `<br>` o un `<span>` le llegan al estudiante como
// texto literal, mientras el preview del panel los borra en silencio (`rehype-sanitize`). El
// preview miente, así que el guardado rechaza el HTML crudo en vez de dejar pasar la divergencia.
// Los fences ```svg y ```mermaid quedan fuera: ahí el XML/DSL es el contenido, no maquetado. El
// cierre de la apertura es estricto (solo espacios y salto) para no morder ```svgx ni ```mermaidjs,
// que la app tampoco reconoce como fences suyos (`splitRichContent.ts`).
const RICH_FENCE = /```(?:svg|mermaid)[ \t]*\r?\n[\s\S]*?```/gi;

// Lista corta de etiquetas: el enunciado de una pregunta está lleno de desigualdades (`a<b`, `x<y`)
// y un `<[a-z]` genérico las marcaría como HTML. Además un atributo de verdad lleva `=`, si no
// `a<b entonces b>c` pasaría por `<b …>`.
const HTML_TAG_NAME =
  'b|i|u|br|p|div|span|img|a|table|tr|td|th|ul|ol|li|h[1-6]|strong|em|code|pre|sup|sub|small|font|center|iframe|script|style';
const HTML_ATTR = '(?:\\s+[a-zA-Z_:][\\w:.-]*\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s"\'>]+))*';
const HTML_TAG = new RegExp(`</?(?:${HTML_TAG_NAME})${HTML_ATTR}\\s*/?>`, 'i');

export const RAW_HTML_MESSAGE =
  'El HTML no se muestra en la app. Usá Markdown: **negrita**, *cursiva*, listas con - o una tabla.';

export function hasRawHtmlOutsideSvg(md: string): boolean {
  return HTML_TAG.test(md.replace(RICH_FENCE, ''));
}
