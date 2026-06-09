'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CircleCheckIcon, CircleDashedIcon, PlusIcon, PowerIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/lib/status-badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  useProhibitedWords,
  useProhibitedWordMutations,
  type ProhibitedWord,
} from '@/hooks/use-prohibited-words';
import type { ReportSeverity } from '@/hooks/use-moderation';
import { SEVERITY_META, SeverityBadge } from '@/lib/severity';

const SEVERITIES: ReportSeverity[] = ['low', 'medium', 'high', 'critical'];

export function ProhibitedWordsManager() {
  const { data, isLoading, isError } = useProhibitedWords();
  const { create, update, remove } = useProhibitedWordMutations();

  const [newWord, setNewWord] = useState('');
  const [newSeverity, setNewSeverity] = useState<ReportSeverity>('medium');
  const [removeTarget, setRemoveTarget] = useState<ProhibitedWord | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ProhibitedWord | null>(null);

  const words = data ?? [];

  async function add() {
    const word = newWord.trim();
    if (!word) return;
    try {
      await create.mutateAsync({ word, severity: newSeverity, isActive: true });
      toast.success('Palabra agregada');
      setNewWord('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function setActive(w: ProhibitedWord, isActive: boolean) {
    try {
      await update.mutateAsync({ id: w.id, input: { isActive } });
      toast.success(isActive ? 'Palabra activada' : 'Palabra desactivada');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // Activar es inofensivo → directo. Desactivar baja una protección → confirm.
  function onToggle(w: ProhibitedWord) {
    if (w.isActive) setDeactivateTarget(w);
    else setActive(w, true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          className="w-64"
          placeholder="Nueva palabra…"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Select value={newSeverity} onValueChange={(v) => setNewSeverity(v as ReportSeverity)}>
          <SelectTrigger className="w-36" size="sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {SEVERITY_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!newWord.trim() || create.isPending} onClick={add}>
          <PlusIcon className="size-4" /> Agregar
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <p className="text-destructive text-sm">No se pudieron cargar las palabras.</p>
      ) : words.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin palabras en la lista.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Palabra</TableHead>
              <TableHead>Severidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-mono">{w.word}</TableCell>
                <TableCell>
                  <SeverityBadge severity={w.severity} />
                </TableCell>
                <TableCell>
                  {w.isActive ? (
                    <StatusBadge tone="success" icon={CircleCheckIcon} label="Activa" />
                  ) : (
                    <StatusBadge tone="muted" icon={CircleDashedIcon} label="Inactiva" />
                  )}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={
                      w.isActive
                        ? 'text-destructive hover:text-destructive'
                        : 'text-success hover:text-success'
                    }
                    onClick={() => onToggle(w)}
                  >
                    <PowerIcon className="size-4" /> {w.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget(w)}
                  >
                    <Trash2Icon className="size-4" /> Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
        title="Desactivar palabra"
        description={
          deactivateTarget
            ? `«${deactivateTarget.word}» dejará de bloquearse en nombres y títulos hasta que la reactives.`
            : ''
        }
        destructive
        confirmLabel="Desactivar"
        onConfirm={async () => {
          if (deactivateTarget) await setActive(deactivateTarget, false);
        }}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Eliminar palabra"
        description={removeTarget ? `Se quita «${removeTarget.word}» de la lista.` : ''}
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (removeTarget) await remove.mutateAsync(removeTarget.id);
          toast.success('Palabra eliminada');
        }}
      />
    </div>
  );
}
