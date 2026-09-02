'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export type WeekRow = { week: string; accuracyPct: number; total: number };

const config = {
  accuracyPct: { label: 'Aciertos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const FILL_ID = 'evolucion-semanal-fill';

const weekTick = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

type TrendDotProps = {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: WeekRow;
};

// El único punto que se marca es el último: es "dónde está hoy" el estudiante. Marcar
// los siete convierte la línea en un collar de puntos y ninguno destaca.
const lastPointRenderer = (count: number) =>
  function TrendLastPoint({ cx, cy, index, payload }: TrendDotProps) {
    if (index !== count - 1 || cx == null || cy == null || !payload) return null;
    return (
      <g data-slot="trend-last-point">
        <circle cx={cx} cy={cy} r={8} fill="var(--color-accuracyPct)" opacity={0.2} />
        <circle cx={cx} cy={cy} r={4.5} fill="var(--color-accuracyPct)" />
        <text
          x={cx - 14}
          y={cy - 10}
          textAnchor="end"
          className="fill-foreground text-[11px] font-semibold"
        >
          {payload.accuracyPct}%
        </text>
      </g>
    );
  };

export function WeeklyTrendChart({ data }: { data: WeekRow[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-full w-full">
      {/* El SVG va `aria-hidden` con una tabla `sr-only` al lado (la card la arma): la
          capa de accesibilidad de recharts metería un elemento focusable dentro de un
          contenedor oculto, que es peor que no tenerla. */}
      <AreaChart
        accessibilityLayer={false}
        data={data}
        margin={{ top: 14, right: 12, bottom: 0, left: 12 }}
      >
        <defs>
          <linearGradient id={FILL_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accuracyPct)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-accuracyPct)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="week"
          tickFormatter={weekTick}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10.5 }}
        />
        {/* Sin rótulos de eje: el 0/50/100 se lee en las tres líneas de la grilla y el
            dato que importa (dónde está hoy) va escrito sobre el punto final. */}
        <YAxis hide domain={[0, 100]} ticks={[0, 50, 100]} />
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
          type="linear"
          stroke="var(--color-accuracyPct)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill={`url(#${FILL_ID})`}
          fillOpacity={1}
          dot={lastPointRenderer(data.length)}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
