'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { unwrapData } from '@/lib/bff';
import { useModulesTree } from '@/hooks/use-modules-tree';

export function AiGenerateDialog() {
  const qc = useQueryClient();
  const { data: tree } = useModulesTree();
  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);

  const modules = tree ?? [];
  const subjects = modules.find((m) => m.id === moduleId)?.subjects ?? [];
  const topics = subjects.find((s) => s.id === subjectId)?.topics ?? [];

  async function generate(): Promise<void> {
    if (!moduleId || !subjectId || !topicId) {
      toast.error('Elegí módulo, materia y tema');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/admin/content/questions/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ moduleId, subjectId, topicId, difficulty, count }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { message?: string };
      toast.error(b.message ?? 'Error generando');
      return;
    }
    const data = unwrapData<{ created: number }>(await res.json());
    toast.success(`${data?.created ?? 0} preguntas generadas como borrador`);
    qc.invalidateQueries({ queryKey: ['questions'] });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <SparklesIcon className="size-4" />
          Generar IA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar preguntas con IA</DialogTitle>
          <DialogDescription>Entran como borrador para revisión humana.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field>
            <FieldLabel>Módulo</FieldLabel>
            <Select
              value={moduleId || undefined}
              onValueChange={(v) => {
                setModuleId(v);
                setSubjectId('');
                setTopicId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.country} · {m.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Materia</FieldLabel>
              <Select
                value={subjectId || undefined}
                onValueChange={(v) => {
                  setSubjectId(v);
                  setTopicId('');
                }}
                disabled={!moduleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Materia" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Tema</FieldLabel>
              <Select value={topicId || undefined} onValueChange={setTopicId} disabled={!subjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tema" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Dificultad</FieldLabel>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="ai-count">Cantidad (1-20)</FieldLabel>
              <Input
                id="ai-count"
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={generate} disabled={busy}>
            {busy ? 'Generando…' : 'Generar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
