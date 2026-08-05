'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isHexColor } from '@/lib/email-contrast';

/**
 * Color de la identidad. `value` null = usar el default del email, y el input de
 * color muestra ese default como si estuviera puesto (es lo que el destinatario
 * va a ver), mientras el texto hex queda vacío para distinguir "sin configurar".
 */
export function BrandColorField({
  label,
  hint,
  value,
  fallback,
  warning,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  fallback: string;
  warning?: string;
  onChange: (hex: string | null) => void;
}) {
  const effective = value ?? fallback;
  const malformed = value !== null && value !== '' && !isHexColor(value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        {/* input[type=color] es el picker nativo: no hay primitivo shadcn de color
            y envolverlo en uno propio sería duplicar el control del navegador. */}
        <Input
          type="color"
          aria-label={`${label} — selector de color`}
          value={isHexColor(effective) ? effective : fallback}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-12 shrink-0 p-1"
        />
        <Input
          value={value ?? ''}
          placeholder={fallback}
          maxLength={7}
          aria-label={`${label} — código hex`}
          onChange={(e) => onChange(e.target.value.trim().toUpperCase() || null)}
          className="font-mono"
        />
        {value !== null && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Restaurar
          </Button>
        )}
      </div>
      {malformed ? (
        <p className="text-destructive text-xs">Formato inválido. Usá un hex de 6 dígitos (#408D99).</p>
      ) : warning ? (
        <p className="text-destructive text-xs">{warning}</p>
      ) : (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
    </div>
  );
}
