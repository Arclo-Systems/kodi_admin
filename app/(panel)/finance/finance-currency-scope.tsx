'use client';

import { CircleAlertIcon, InfoIcon } from 'lucide-react';
import { FINANCE_CURRENCIES, type Consolidation, type CurrencyScope } from '@/hooks/use-finance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// El backend acepta `currency` XOR `consolidateTo` y responde 400 si viajan las
// dos. Un solo selector con dos grupos hace imposible elegir ambas: el estado no
// puede representar la combinación que el backend rechaza.
const CONSOLIDATE_PREFIX = 'consolidateTo:';

export type CurrencyScopeValue = string;

const consolidateOption = (currency: string): CurrencyScopeValue =>
  `${CONSOLIDATE_PREFIX}${currency}`;

/** `'CRC'` → `{ currency: 'CRC' }` · `'consolidateTo:USD'` → `{ consolidateTo: 'USD' }`. */
export function currencyScopeParams(value: CurrencyScopeValue): CurrencyScope {
  return value.startsWith(CONSOLIDATE_PREFIX)
    ? { consolidateTo: value.slice(CONSOLIDATE_PREFIX.length) }
    : { currency: value };
}

/**
 * Moneda del reporte, o moneda a la que consolidarlo. Las dos opciones viven en
 * el mismo `Select` porque son excluyentes: son la misma pregunta ("¿en qué
 * moneda leo esto?") con dos respuestas posibles.
 */
export function CurrencyScopeSelect({
  value,
  onChange,
  currencies = FINANCE_CURRENCIES,
  label = 'Moneda',
  className = 'w-52',
}: {
  value: CurrencyScopeValue;
  onChange: (value: CurrencyScopeValue) => void;
  /**
   * Monedas que el reporte SÍ puede mostrar por separado. El P&L pasa las que
   * trae la respuesta: ofrecer una que no está en los datos deja el selector
   * diciendo una moneda y los KPI mostrando otra.
   *
   * "Consolidar a" no se acota: se puede convertir a una moneda que todavía no
   * tiene movimientos.
   */
  currencies?: readonly string[];
  label?: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} size="sm" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Por moneda</SelectLabel>
          {currencies.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Consolidar a</SelectLabel>
          {FINANCE_CURRENCIES.map((c) => (
            <SelectItem key={c} value={consolidateOption(c)}>
              Consolidar a {c}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/**
 * Con qué tasa se convirtió cada moneda, y cuáles se quedaron afuera.
 *
 * La fecha de la tasa no es la del corte: se usa la ÚLTIMA cargada con fecha
 * anterior o igual, porque las tasas se cargan a mano y no todos los días tienen
 * una. Decir "convertido al tipo del <fecha>" es lo que hace auditable el número.
 *
 * Una moneda sin tasa NO se suma con factor 1 ni se omite en silencio: se nombra
 * y su importe queda fuera de todo total (criterio 16 del plan).
 */
export function ConsolidationBanner({ consolidation }: { consolidation: Consolidation }) {
  if (!consolidation) return null;
  const { to, rates, missing } = consolidation;

  return (
    <div className="space-y-3">
      <Alert>
        <InfoIcon />
        <AlertDescription className="space-y-1">
          <p>Convertido a {to}. Los importes de este reporte están en {to}.</p>
          {rates.length === 0 ? (
            <p className="text-muted-foreground">
              No hizo falta convertir: todos los importes ya estaban en {to}.
            </p>
          ) : (
            <ul className="text-muted-foreground space-y-0.5">
              {rates.map((r) => (
                <li key={`${r.from}-${r.to}-${r.date}`} className="tabular-nums">
                  1 {r.from} = {r.rate} {r.to} — tipo del {r.date} ({r.source})
                </li>
              ))}
            </ul>
          )}
        </AlertDescription>
      </Alert>

      {missing.length > 0 && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            Sin tipo de cambio para: {missing.join(', ')} → N/A. Esos importes NO están sumados en
            ningún total. Cargá la tasa en Tipos de cambio y volvé a consolidar.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
