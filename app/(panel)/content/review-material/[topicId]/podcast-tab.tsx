'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
  WandSparklesIcon,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/admin/empty-state';
import { AudioPreview } from '@/components/admin/audio-preview';
import { AssetUpload } from '@/components/admin/asset-upload';
import {
  presignPodcastAudio,
  useCharacterVoices,
  usePodcastEpisode,
  useReviewMaterialMutations,
  useScriptVersions,
  type ScriptSegment,
} from '@/hooks/use-review-material';
import { moveItem } from '@/lib/reorder';
import { PieceActions } from './piece-actions';
import { VersionHistory } from './version-history';

const AUDIO_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
};

/** Duración real del archivo, leída del elemento de audio antes de confirmar. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(audio.duration));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la duración del audio'));
    };
    audio.src = url;
  });
}

export function PodcastTab({ topicId, canPublish }: { topicId: string; canPublish: boolean }) {
  const { data, isLoading, isError, error } = usePodcastEpisode(topicId);
  const { data: voices } = useCharacterVoices();
  const { savePodcast, approveScript, confirmAudio } = useReviewMaterialMutations(topicId);
  const versions = useScriptVersions(topicId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptSegment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);

  // Re-siembra desde lo persistido cuando el servidor cambia (ver flashcards-tab).
  const serverSeed = data ? `${data.id ?? 'nuevo'}:${data.updatedAt ?? ''}` : null;
  if (data && serverSeed !== seed) {
    setSeed(serverSeed);
    setTitle(data.title ?? '');
    setArtworkUrl(data.artworkUrl);
    setScript(data.script);
  }

  const activeVoices = (voices ?? []).filter((v) => v.isActive);
  const nameByKey = new Map((voices ?? []).map((v) => [v.key, v.displayName]));

  function update(index: number, patch: Partial<ScriptSegment>): void {
    setScript((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function move(index: number, delta: number): void {
    setScript((prev) => moveItem(prev, index, delta));
  }

  async function save(): Promise<void> {
    if (script.some((s) => !s.characterKey || !s.text.trim())) {
      toast.error('Hay segmentos sin personaje o sin texto');
      return;
    }
    try {
      await savePodcast.mutateAsync({ title: title.trim() || null, artworkUrl, script });
      toast.success(`Guión guardado (${script.length} segmentos)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el guión');
    }
  }

  async function approve(): Promise<void> {
    try {
      await approveScript.mutateAsync();
      toast.success('Guión aprobado — ya se le puede poner audio');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo aprobar el guión');
    }
  }

  async function uploadAudio(file: File): Promise<void> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const contentType = AUDIO_TYPES[ext];
    if (!contentType) {
      toast.error('Formato no soportado: subí un .mp3 o un .m4a');
      return;
    }
    setUploading(true);
    try {
      const durationSeconds = await readDuration(file);
      // El archivo va DIRECTO a R2 con la URL firmada; el BFF solo firma y confirma.
      const { uploadUrl, publicUrl } = await presignPodcastAudio(topicId, {
        filename: file.name,
        contentType,
      });
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': contentType },
        body: file,
      });
      if (!res.ok) throw new Error(`La subida a R2 falló (${res.status})`);
      await confirmAudio.mutateAsync({ key: publicUrl, durationSeconds });
      toast.success('Audio subido y listo para publicar');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo subir el audio');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : 'No se pudo cargar el episodio.'}
        </AlertDescription>
      </Alert>
    );
  }

  const status = data?.status ?? 'empty';

  return (
    <div className="space-y-4">
      <PieceActions
        topicId={topicId}
        piece="podcast"
        state={status}
        canPublish={canPublish}
      />

      {activeVoices.length === 0 && (
        <Alert>
          <AlertDescription>
            No hay personajes activos. Cargalos en Configuración antes de escribir el guión.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Guión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="podcast-title">Título del episodio</FieldLabel>
              <Input
                id="podcast-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Álgebra en 15 minutos"
              />
            </Field>

            <Field>
              <FieldLabel>Portada del episodio</FieldLabel>
              <AssetUpload
                value={artworkUrl}
                onChange={setArtworkUrl}
                endpoint="/api/admin/content/review-material/upload-image"
                label="Subir portada"
              />
              <FieldDescription>
                Opcional: el episodio se publica con o sin arte. Se guarda con el guión.
              </FieldDescription>
            </Field>

            {script.length === 0 && (
              <EmptyState
                message="Todavía no hay guión"
                description="Agregá el primer parlamento o pedí un borrador con IA."
              />
            )}

            {script.map((segment, index) => (
              <div key={index} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={segment.characterKey || undefined}
                    onValueChange={(v) => update(index, { characterKey: v })}
                  >
                    <SelectTrigger className="w-48" aria-label={`Personaje del segmento ${index + 1}`}>
                      <SelectValue placeholder="Personaje" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeVoices.map((voice) => (
                        <SelectItem key={voice.key} value={voice.key}>
                          {voice.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Subir segmento"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpIcon className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Bajar segmento"
                      disabled={index === script.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownIcon className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Quitar segmento"
                      onClick={() => setScript((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2Icon className="text-destructive size-4" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={segment.text}
                  onChange={(e) => update(index, { text: e.target.value })}
                  rows={4}
                  maxLength={20000}
                  aria-label={`Texto del segmento ${index + 1}`}
                  placeholder="Lo que dice el personaje"
                />
              </div>
            ))}

            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setScript((prev) => [
                    ...prev,
                    { characterKey: activeVoices[0]?.key ?? '', text: '' },
                  ])
                }
                disabled={activeVoices.length === 0}
              >
                <PlusIcon className="size-4" />
                Agregar parlamento
              </Button>
              <Button onClick={save} disabled={savePodcast.isPending}>
                <SaveIcon className="size-4" />
                {savePodcast.isPending ? 'Guardando…' : 'Guardar guión'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vista previa del guión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {artworkUrl && (
                <div className="flex items-center gap-3">
                  <Image
                    src={artworkUrl}
                    alt=""
                    width={96}
                    height={96}
                    className="rounded-lg border object-cover"
                    unoptimized
                  />
                  <p className="text-sm font-medium">{title || 'Episodio sin título'}</p>
                </div>
              )}
              {script.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin parlamentos todavía.</p>
              ) : (
                script.map((segment, index) => (
                  <p key={index} className="text-sm leading-relaxed">
                    <span className="text-primary font-semibold">
                      {nameByKey.get(segment.characterKey) ?? segment.characterKey ?? '¿?'}:
                    </span>{' '}
                    {segment.text || <span className="text-muted-foreground">(vacío)</span>}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <VersionHistory
            topicId={topicId}
            piece="podcast"
            isLoading={versions.isLoading}
            entries={(versions.data ?? []).map((v) => ({
              id: v.id,
              version: v.version,
              createdAt: v.createdAt,
              preview: v.script.map((s) => s.text).join(' · '),
            }))}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Audio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.audioUrl ? (
                <AudioPreview src={data.audioUrl} durationSeconds={data.durationSeconds} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Todavía no hay audio. Aprobá el guión y subí el archivo.
                </p>
              )}

              <Field>
                <FieldLabel htmlFor="podcast-audio">Subir audio (.mp3 o .m4a)</FieldLabel>
                <Input
                  id="podcast-audio"
                  ref={fileRef}
                  type="file"
                  accept="audio/mpeg,audio/mp4,.mp3,.m4a"
                  disabled={status === 'empty' || uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadAudio(file);
                  }}
                />
                <FieldDescription>
                  Va directo a R2 con una URL firmada. Máximo 60 MB.
                </FieldDescription>
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={approve}
                  disabled={status !== 'draft' || approveScript.isPending}
                >
                  <CheckIcon className="size-4" />
                  Aprobar guión
                </Button>
                {/* Se habilita cuando haya proveedor de voces: hoy el backend
                    responde 409 TTS_NOT_CONFIGURED. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button variant="outline" disabled>
                        <WandSparklesIcon className="size-4" />
                        Generar audio
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Falta elegir proveedor de voces</TooltipContent>
                </Tooltip>
                {uploading && (
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    <UploadIcon className="size-4" aria-hidden />
                    Subiendo…
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
