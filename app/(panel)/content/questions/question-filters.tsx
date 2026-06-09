'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModulesTree } from '@/hooks/use-modules-tree';
import type { Difficulty, QuestionListQuery, QuestionStatus } from '@/hooks/use-questions';

const ALL = '__all__';

const STATUSES: { value: QuestionStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'review', label: 'En revisión' },
  { value: 'active', label: 'Activa' },
  { value: 'inactive', label: 'Inactiva' },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Difícil' },
];

export function QuestionFilters({
  value,
  onChange,
}: {
  value: QuestionListQuery;
  onChange: (q: QuestionListQuery) => void;
}) {
  const { data: tree } = useModulesTree();
  const modules = tree ?? [];
  const subjects = modules.find((m) => m.id === value.moduleId)?.subjects ?? [];
  const topics = subjects.find((s) => s.id === value.subjectId)?.topics ?? [];

  const set = (patch: Partial<QuestionListQuery>) => onChange({ ...value, page: 1, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar texto…"
        value={value.search ?? ''}
        onChange={(e) => set({ search: e.target.value || undefined })}
        className="w-56"
        aria-label="Buscar preguntas por texto"
      />

      <Select
        value={value.moduleId ?? ALL}
        onValueChange={(v) =>
          set({ moduleId: v === ALL ? undefined : v, subjectId: undefined, topicId: undefined })
        }
      >
        <SelectTrigger className="w-44" aria-label="Filtrar por módulo">
          <SelectValue placeholder="Módulo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los módulos</SelectItem>
          {modules.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.country} · {m.shortName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.subjectId ?? ALL}
        onValueChange={(v) => set({ subjectId: v === ALL ? undefined : v, topicId: undefined })}
        disabled={!value.moduleId}
      >
        <SelectTrigger className="w-40" aria-label="Filtrar por materia">
          <SelectValue placeholder="Materia" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las materias</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.topicId ?? ALL}
        onValueChange={(v) => set({ topicId: v === ALL ? undefined : v })}
        disabled={!value.subjectId}
      >
        <SelectTrigger className="w-40" aria-label="Filtrar por tema">
          <SelectValue placeholder="Tema" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los temas</SelectItem>
          {topics.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.status ?? ALL}
        onValueChange={(v) => set({ status: v === ALL ? undefined : (v as QuestionStatus) })}
      >
        <SelectTrigger className="w-36" aria-label="Filtrar por estado">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los estados</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.difficulty ?? ALL}
        onValueChange={(v) => set({ difficulty: v === ALL ? undefined : (v as Difficulty) })}
      >
        <SelectTrigger className="w-32" aria-label="Filtrar por dificultad">
          <SelectValue placeholder="Dificultad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toda dificultad</SelectItem>
          {DIFFICULTIES.map((d) => (
            <SelectItem key={d.value} value={d.value}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
