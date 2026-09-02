'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export type SubjectRow = { subject: string; accuracyPct: number; topics: number };
export type WeekRow = { week: string; accuracyPct: number; total: number };

const subjectConfig = {
  accuracyPct: { label: 'Aciertos' },
  solid: { label: 'Sólido', color: 'var(--success)' },
  partial: { label: 'A medias', color: 'var(--warning)' },
  // `--destructive` en oscuro (#B34734 sobre la card #1B2932) mide 2.7:1 — por debajo
  // del 3:1 que WCAG 1.4.11 exige a un objeto gráfico. El coral claro de la paleta
  // (`--chart-5`) mide 5.6:1 ahí, y el oscuro 5.4:1 sobre la card blanca del tema claro.
  weak: { label: 'Frágil', theme: { light: 'var(--destructive)', dark: 'var(--chart-5)' } },
} satisfies ChartConfig;

const weeklyConfig = {
  accuracyPct: { label: 'Aciertos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const tone = (pct: number): 'solid' | 'partial' | 'weak' =>
  pct >= 70 ? 'solid' : pct >= 40 ? 'partial' : 'weak';

const topicsLabel = (n: number) => `${n} ${n === 1 ? 'tema' : 'temas'}`;
const weekTick = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// El % solo es legible con su respaldo al lado: "33% · 2 temas" desambigua el
// "33% · 2" viejo, que no decía de qué era el 2.
export const subjectBarLabel = (row: SubjectRow) =>
  `${row.accuracyPct}% · ${topicsLabel(row.topics)}`;

export function SubjectAccuracyChart({ data }: { data: SubjectRow[] }) {
  const rows = data.map((d) => ({ ...d, label: subjectBarLabel(d) }));

  return (
    <ChartContainer config={subjectConfig} className="aspect-auto h-full w-full">
      {/* El SVG va `aria-hidden` con una tabla `sr-only` al lado (la card la arma): la
          capa de accesibilidad de recharts metería un elemento focusable dentro de un
          contenedor oculto, que es peor que no tenerla. */}
      <BarChart
        accessibilityLayer={false}
        layout="vertical"
        data={rows}
        // El margen derecho es el que aloja el rótulo del % + los temas: si queda corto,
        // recharts lo parte en varias líneas.
        margin={{ top: 4, right: 120, bottom: 4, left: 0 }}
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="subject"
          width={124}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(value) => (
                <span className="tabular-nums">{Number(value)}% de aciertos</span>
              )}
            />
          }
        />
        {/* Sin animación de entrada: recharts recién dibuja el `LabelList` cuando la
            barra termina de crecer, y en una herramienta de trabajo el número no puede
            tardar en aparecer. */}
        <Bar dataKey="accuracyPct" barSize={14} radius={4} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.subject} fill={`var(--color-${tone(r.accuracyPct)})`} />
          ))}
          <LabelList
            dataKey="label"
            position="right"
            offset={8}
            fontSize={11}
            className="fill-muted-foreground"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function WeeklyTrendChart({ data }: { data: WeekRow[] }) {
  return (
    <ChartContainer config={weeklyConfig} className="aspect-auto h-full w-full">
      <AreaChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="week"
          tickFormatter={weekTick}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          domain={[0, 100]}
          width={40}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const week = payload[0]?.payload as WeekRow | undefined;
                return week ? `Semana del ${weekTick(week.week)} · ${week.total} preguntas` : '';
              }}
              formatter={(value) => (
                <span className="tabular-nums">{Number(value)}% de aciertos</span>
              )}
            />
          }
        />
        <Area
          dataKey="accuracyPct"
          type="monotone"
          stroke="var(--color-accuracyPct)"
          fill="var(--color-accuracyPct)"
          fillOpacity={0.18}
          strokeWidth={2}
          dot={{ r: 2.5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
