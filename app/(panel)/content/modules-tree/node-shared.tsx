'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import type { TreeModule, TreeSubject, TreeTopic } from '@/hooks/use-modules-tree';

// Qué nodo del árbol se está editando o creando.
export type TreeView =
  | { kind: 'module'; id: string }
  | { kind: 'subject'; id: string; moduleId: string }
  | { kind: 'topic'; id: string; subjectId: string }
  | { kind: 'new-module' }
  | { kind: 'new-subject'; moduleId: string }
  | { kind: 'new-topic'; subjectId: string }
  | null;

export function findSubject(tree: TreeModule[], id: string): TreeSubject | undefined {
  for (const m of tree) {
    const s = m.subjects.find((x) => x.id === id);
    if (s) return s;
  }
}

export function findTopic(tree: TreeModule[], id: string): TreeTopic | undefined {
  for (const m of tree)
    for (const s of m.subjects) {
      const t = s.topics.find((x) => x.id === id);
      if (t) return t;
    }
}

export function findModuleOfSubject(
  tree: TreeModule[],
  subjectId: string,
): TreeModule | undefined {
  return tree.find((m) => m.subjects.some((s) => s.id === subjectId));
}

/**
 * Desde que cada nodo tiene URL propia, un enlace viejo o un nodo que otro
 * admin borró llegaban al formulario y lo pintaban en blanco, sin explicación.
 */
export function NodeNotFound({ tipo }: { tipo: string }) {
  return (
    <div className="space-y-3 py-6 text-center">
      <p className="text-sm font-medium">{tipo} ya no existe</p>
      <p className="text-muted-foreground text-sm">
        Puede que alguien la haya eliminado, o que el enlace sea viejo.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/content/modules-tree">Volver al árbol</Link>
      </Button>
    </div>
  );
}

export function DeleteButton({
  label,
  title,
  description,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon className="size-4" /> {label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        destructive
        confirmLabel="Eliminar"
        onConfirm={onConfirm}
      />
    </>
  );
}
