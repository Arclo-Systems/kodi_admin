'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { EyeIcon, LayersIcon, NewspaperIcon, PlusIcon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { useModulesTree } from '@/hooks/use-modules-tree';
import type { NewsCategory, NewsDetail } from '@/hooks/use-news';
import { MarkdownEditor } from './markdown-editor';
import { NewsPreview } from './news-preview';
import { NewsImageUpload } from './news-image-upload';

type FormValues = {
  country: string;
  category: NewsCategory;
  moduleId: string;
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
};

export function NewsForm({ mode, initial }: { mode: 'create' | 'edit'; initial?: NewsDetail }) {
  const router = useRouter();
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    defaultValues: initial
      ? {
          country: initial.country,
          category: initial.category,
          moduleId: initial.moduleId ?? '',
          title: initial.title,
          summary: initial.summary,
          body: initial.body,
          imageUrl: initial.imageUrl,
        }
      : {
          country: COUNTRIES[0]?.code ?? 'CR',
          category: 'module',
          moduleId: '',
          title: '',
          summary: '',
          body: '',
          imageUrl: null,
        },
  });
  const values = form.watch();
  const { data: tree } = useModulesTree(values.country);
  const modules = tree ?? [];

  async function submit(v: FormValues): Promise<void> {
    if (mode === 'create' && v.category === 'module' && !v.moduleId) {
      form.setError('moduleId', { message: 'Elegí un módulo' });
      return;
    }
    const url = mode === 'create' ? '/api/admin/content/news' : `/api/admin/content/news/${initial?.id}`;
    const payload =
      mode === 'create'
        ? {
            country: v.country,
            category: v.category,
            moduleId: v.category === 'module' ? v.moduleId : null,
            title: v.title,
            summary: v.summary,
            body: v.body,
            imageUrl: v.imageUrl,
            status: 'draft',
          }
        : { title: v.title, summary: v.summary, body: v.body, imageUrl: v.imageUrl };
    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { message?: string };
      toast.error(b.message ?? 'Error guardando la noticia');
      return;
    }
    toast.success(mode === 'create' ? 'Noticia creada como borrador' : 'Noticia actualizada');
    qc.invalidateQueries({ queryKey: ['news'] });
    if (initial) qc.invalidateQueries({ queryKey: ['news-article', initial.id] });
    router.push('/content/news');
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardContent>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
            {mode === 'create' && (
              <fieldset className="min-w-0 space-y-3">
                <legend className="flex items-center gap-2 text-sm font-medium">
                  <LayersIcon className="text-primary size-4" />
                  Clasificación
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Controller
              name="country"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>País</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      form.setValue('moduleId', '');
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
              )}
            />
            <Controller
              name="category"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Categoría</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="module">Módulo</SelectItem>
                      <SelectItem value="education">Educación</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            {values.category === 'module' && (
              <Controller
                name="moduleId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Módulo</FieldLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}
                </div>
              </fieldset>
            )}

            <fieldset className="min-w-0 space-y-4">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <NewspaperIcon className="text-primary size-4" />
                Contenido
              </legend>
        <Controller
          name="title"
          control={form.control}
          rules={{ required: 'Requerido' }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="n-title">Título</FieldLabel>
              <Input {...field} id="n-title" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="summary"
          control={form.control}
          rules={{ required: 'Requerido' }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="n-summary">Resumen</FieldLabel>
              <Textarea {...field} id="n-summary" rows={2} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="body"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Cuerpo (Markdown)</FieldLabel>
              <MarkdownEditor value={field.value} onChange={field.onChange} />
            </Field>
          )}
        />

        <Controller
          name="imageUrl"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Imagen</FieldLabel>
              <NewsImageUpload value={field.value} onChange={field.onChange} />
            </Field>
          )}
        />
            </fieldset>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/content/news')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {mode === 'create' ? (
                  <PlusIcon className="size-4" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                {mode === 'create' ? 'Crear borrador' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <EyeIcon className="text-info size-4" />
          Vista previa
        </h2>
        <NewsPreview
          category={values.category}
          title={values.title}
          summary={values.summary}
          body={values.body}
          imageUrl={values.imageUrl}
        />
      </div>
    </div>
  );
}
