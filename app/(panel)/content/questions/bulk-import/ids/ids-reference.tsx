'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { filterByName, selectSubjects, selectTopicsBySubject } from './ids-helpers';

function CopyId({ id }: { id: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="font-mono text-xs"
      aria-label={`Copiar ID ${id}`}
      onClick={() => {
        void navigator.clipboard.writeText(id);
        toast.success('ID copiado');
      }}
    >
      <CopyIcon className="size-3.5" />
      {id}
    </Button>
  );
}

export function IdsReference() {
  const sp = useSearchParams();
  const { data: tree, isLoading } = useModulesTree();
  const [moduleId, setModuleId] = useState(sp.get('moduleId') ?? '');
  const [tab, setTab] = useState<'subjects' | 'topics'>('subjects');
  const [query, setQuery] = useState('');

  const modules = useMemo(() => tree ?? [], [tree]);
  const subjects = useMemo(
    () => filterByName(selectSubjects(modules, moduleId), query),
    [modules, moduleId, query],
  );
  const groups = useMemo(
    () =>
      selectTopicsBySubject(modules, moduleId).map((g) => ({
        ...g,
        topics: filterByName(g.topics, query),
      })),
    [modules, moduleId, query],
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={moduleId || undefined} onValueChange={setModuleId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Elegí el módulo" />
          </SelectTrigger>
          <SelectContent>
            {modules.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.country} · {m.shortName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar por nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-56"
          aria-label="Buscar por nombre"
        />
      </div>

      {!moduleId ? (
        <p className="text-muted-foreground text-sm">Elegí un módulo para ver sus IDs.</p>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'subjects' | 'topics')}>
          <TabsList>
            <TabsTrigger value="subjects" onClick={() => setTab('subjects')}>
              Materias
            </TabsTrigger>
            <TabsTrigger value="topics" onClick={() => setTab('topics')}>
              Temas
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">ID</TableHead>
                  <TableHead>Nombre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tab === 'subjects'
                  ? subjects.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <CopyId id={s.id} />
                        </TableCell>
                        <TableCell>{s.name}</TableCell>
                      </TableRow>
                    ))
                  : groups.flatMap((g) =>
                      g.topics.length === 0
                        ? []
                        : [
                            <TableRow key={`g-${g.subject}`} className="bg-muted/40">
                              <TableCell
                                colSpan={2}
                                className="text-muted-foreground text-xs font-medium uppercase"
                              >
                                {g.subject}
                              </TableCell>
                            </TableRow>,
                            ...g.topics.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>
                                  <CopyId id={t.id} />
                                </TableCell>
                                <TableCell>{t.name}</TableCell>
                              </TableRow>
                            )),
                          ],
                    )}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      )}
    </div>
  );
}
