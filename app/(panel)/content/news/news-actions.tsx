'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarClockIcon, CopyIcon, EyeOffIcon, SendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { useNewsMutations, type NewsDetail } from '@/hooks/use-news';
import { NewsStatusBadge } from '@/lib/news-status';

export function NewsActions({ article }: { article: NewsDetail }) {
  const m = useNewsMutations();
  const [scheduleAt, setScheduleAt] = useState('');
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const onError = (e: Error) => toast.error(e.message);

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Estado</span>
        <NewsStatusBadge status={article.status} />
        <div className="ml-auto flex flex-wrap gap-2">
          {article.status !== 'published' && (
            <Button
              size="sm"
              onClick={() =>
                m.publish.mutate(article.id, { onSuccess: () => toast.success('Publicada'), onError })
              }
            >
              <SendIcon className="size-4" /> Publicar ahora
            </Button>
          )}
          {article.status === 'published' && (
            <Button size="sm" variant="outline" onClick={() => setConfirmUnpublish(true)}>
              <EyeOffIcon className="size-4" /> Despublicar
            </Button>
          )}
          <DuplicateNews article={article} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DateTimePicker
          value={scheduleAt}
          onChange={setScheduleAt}
          className="w-80 max-w-full"
          aria-label="Fecha de publicación programada"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!scheduleAt}
          onClick={() =>
            m.schedule.mutate(
              { id: article.id, publishedAt: new Date(scheduleAt).toISOString() },
              { onSuccess: () => toast.success('Programada'), onError },
            )
          }
        >
          <CalendarClockIcon className="size-4" /> Programar
        </Button>
      </div>

      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={(o) => !o && setConfirmUnpublish(false)}
        destructive
        title="Despublicar noticia"
        description="Dejará de verse en la app. Podés volver a publicarla cuando quieras."
        confirmLabel="Despublicar"
        onConfirm={async () => {
          await m.unpublish.mutateAsync(article.id);
          toast.success('Despublicada');
        }}
      />
    </div>
  );
}

function DuplicateNews({ article }: { article: NewsDetail }) {
  const m = useNewsMutations();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState(article.country);
  const [moduleId, setModuleId] = useState('');
  const { data: tree } = useModulesTree(country);

  function run(): void {
    m.duplicate.mutate(
      { id: article.id, country, moduleId: article.category === 'module' ? moduleId : null },
      {
        onSuccess: () => {
          toast.success('Noticia duplicada como borrador');
          setOpen(false);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CopyIcon className="size-4" /> Duplicar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicar noticia</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field>
            <FieldLabel>País destino</FieldLabel>
            <Select
              value={country}
              onValueChange={(v) => {
                setCountry(v);
                setModuleId('');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} · {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {article.category === 'module' && (
            <Field>
              <FieldLabel>Módulo destino</FieldLabel>
              <Select value={moduleId || undefined} onValueChange={setModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent>
                  {(tree ?? []).map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {mod.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={run} disabled={article.category === 'module' && !moduleId}>
            <CopyIcon className="size-4" /> Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
