// Encabezado de una pantalla de finanzas. Cada subpágina lo escribe con SU
// título: sin la barra de pestañas, "Finanzas" a secas dejaba de decir dónde
// está parado el que mira. La vuelta al índice la da el breadcrumb del shell.
export function FinancePageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
