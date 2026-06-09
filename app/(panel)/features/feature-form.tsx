'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRIORITY_LABELS, type FeatureInput, type FeaturePriority } from '@/hooks/use-features';

const PRIORITIES: FeaturePriority[] = ['low', 'medium', 'high'];

export function FeatureForm({
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: Partial<FeatureInput>;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (input: { title: string; description?: string; priority: FeaturePriority }) => void;
}) {
  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [priority, setPriority] = useState<FeaturePriority>(defaultValues?.priority ?? 'medium');

  const canSubmit = title.trim().length > 0 && !submitting;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Modo oscuro"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={description}
          maxLength={2000}
          rows={5}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalle de la idea (opcional)"
        />
      </div>
      <div className="space-y-2">
        <Label>Prioridad</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as FeaturePriority)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
