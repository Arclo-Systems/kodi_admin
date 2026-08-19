import type { UserDetail } from '@/lib/user-detail';

// `examDate` es una columna DATE: se formatea desde el texto ISO, sin pasar por
// `new Date()`, porque convertir a la zona local corre la fecha un día.
function fmtExamDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

// Solo lectura (spec §2.10): el panel no cambia el examen activo del usuario —
// eso es una decisión suya, y un admin cambiándolo por detrás sería invisible
// para él.
export function UserExams({ examDates }: { examDates: UserDetail['examDates'] }) {
  if (examDates.length === 0) {
    return <p className="text-muted-foreground text-sm">Sin exámenes declarados.</p>;
  }
  return (
    <ul className="space-y-2">
      {examDates.map((e) => (
        <li key={`${e.moduleId}-${e.examKey}`} className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground w-24 shrink-0">{e.module.shortName}</span>
          <span className="font-medium">{e.examName}</span>
          {e.isActive && <span className="text-primary text-xs font-medium">Activo</span>}
          <span className="text-muted-foreground ml-auto text-xs">
            {e.examDate ? fmtExamDate(e.examDate) : 'Sin fecha'}
          </span>
        </li>
      ))}
    </ul>
  );
}
