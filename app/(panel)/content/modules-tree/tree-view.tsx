'use client';

import * as React from 'react';
import {
  ChevronRightIcon,
  GripVerticalIcon,
  PlusIcon,
} from 'lucide-react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TreeModule } from '@/hooks/use-modules-tree';

export type Selected =
  | { type: 'module'; id: string }
  | { type: 'subject'; id: string; moduleId: string }
  | { type: 'topic'; id: string; subjectId: string }
  | null;

function SortableList({
  ids,
  onReorder,
  children,
}: {
  ids: string[];
  onReorder: (ids: string[]) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent): void {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldI = ids.indexOf(String(active.id));
      const newI = ids.indexOf(String(over.id));
      if (oldI >= 0 && newI >= 0) onReorder(arrayMove(ids, oldI, newI));
    }
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: React.HTMLAttributes<HTMLButtonElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

function DragHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground cursor-grab touch-none"
      aria-label="Reordenar"
      {...props}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
}

const rowBtn = (active: boolean) =>
  `flex-1 truncate rounded px-2 py-1 text-left text-sm hover:bg-muted/60 ${active ? 'bg-muted font-medium' : ''}`;

export function TreeView({
  tree,
  selected,
  onSelect,
  onReorderSubjects,
  onReorderTopics,
  onNewSubject,
  onNewTopic,
  canWriteModules,
}: {
  tree: TreeModule[];
  selected: Selected;
  onSelect: (s: Selected) => void;
  onReorderSubjects: (moduleId: string, orderedIds: string[]) => void;
  onReorderTopics: (subjectId: string, orderedIds: string[]) => void;
  onNewSubject: (moduleId: string) => void;
  onNewTopic: (subjectId: string) => void;
  canWriteModules: boolean;
}) {
  if (tree.length === 0) {
    return <p className="text-muted-foreground p-4 text-sm">No hay módulos todavía.</p>;
  }

  return (
    <div className="space-y-1">
      {tree.map((m) => (
        <Collapsible key={m.id} defaultOpen>
          <div className="flex items-center gap-1">
            <CollapsibleTrigger className="group text-muted-foreground p-1">
              <ChevronRightIcon className="size-4 transition-transform group-data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
            <button
              type="button"
              className={rowBtn(selected?.type === 'module' && selected.id === m.id)}
              onClick={() => onSelect({ type: 'module', id: m.id })}
            >
              {m.country} · {m.shortName}
            </button>
            {!m.isActive && (
              <Badge
                variant="outline"
                className="border-destructive/40 bg-destructive/15 text-destructive"
              >
                Inactivo
              </Badge>
            )}
            <Badge variant="secondary">{m.questionCount}</Badge>
            {canWriteModules && (
              <Button variant="ghost" size="icon" aria-label="Nueva materia" onClick={() => onNewSubject(m.id)}>
                <PlusIcon className="size-4" />
              </Button>
            )}
          </div>

          <CollapsibleContent className="ml-5 border-l pl-2">
            <SortableList
              ids={m.subjects.map((s) => s.id)}
              onReorder={(ids) => onReorderSubjects(m.id, ids)}
            >
              {m.subjects.map((s) => (
                <SortableRow key={s.id} id={s.id}>
                  {(handle) => (
                    <Collapsible>
                      <div className="flex items-center gap-1">
                        <DragHandle {...handle} />
                        <CollapsibleTrigger className="group text-muted-foreground p-1">
                          <ChevronRightIcon className="size-4 transition-transform group-data-[state=open]:rotate-90" />
                        </CollapsibleTrigger>
                        <button
                          type="button"
                          className={rowBtn(selected?.type === 'subject' && selected.id === s.id)}
                          onClick={() => onSelect({ type: 'subject', id: s.id, moduleId: m.id })}
                        >
                          {s.name}
                        </button>
                        <Badge variant="secondary">{s.questionCount}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Nuevo tema"
                          onClick={() => onNewTopic(s.id)}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                      </div>

                      <CollapsibleContent className="ml-5 border-l pl-2">
                        <SortableList
                          ids={s.topics.map((t) => t.id)}
                          onReorder={(ids) => onReorderTopics(s.id, ids)}
                        >
                          {s.topics.map((t) => (
                            <SortableRow key={t.id} id={t.id}>
                              {(handle) => (
                                <div className="flex items-center gap-1">
                                  <DragHandle {...handle} />
                                  <button
                                    type="button"
                                    className={rowBtn(selected?.type === 'topic' && selected.id === t.id)}
                                    onClick={() => onSelect({ type: 'topic', id: t.id, subjectId: s.id })}
                                  >
                                    {t.name}
                                  </button>
                                  <Badge variant="secondary">{t.questionCount}</Badge>
                                </div>
                              )}
                            </SortableRow>
                          ))}
                        </SortableList>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </SortableRow>
              ))}
            </SortableList>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
