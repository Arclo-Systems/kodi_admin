'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ImageIcon, PlusIcon, TagIcon, XIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AssetUpload } from '@/components/admin/asset-upload';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAvatars,
  useAvatarMutations,
  useNames,
  useNameMutations,
  type BotAvatar,
  type BotName,
} from '@/hooks/use-bots';
import { COUNTRIES } from '@/lib/countries';

function AvatarsCard({ canWrite }: { canWrite: boolean }) {
  const { data } = useAvatars();
  const { create, remove } = useAvatarMutations();
  const [removeTarget, setRemoveTarget] = useState<BotAvatar | null>(null);

  // Subir = agregar (buen default: menos fricción que subir → previsualizar → confirmar).
  async function addUploaded(url: string | null): Promise<void> {
    if (!url) return;
    try {
      await create.mutateAsync(url);
      toast.success('Avatar agregado');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const avatars = data ?? [];

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="text-primary size-4" />
          Avatares
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canWrite && (
          <AssetUpload
            value={null}
            onChange={addUploaded}
            endpoint="/api/admin/bots/avatars/upload"
            label="Subir avatar"
          />
        )}
        {avatars.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sin avatares. Subí algunos para que los bots tengan foto.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {avatars.map((a) => (
              <li key={a.id} className="relative">
                <Avatar className="size-14">
                  <AvatarImage src={a.url} alt="" />
                  <AvatarFallback>
                    <ImageIcon className="text-muted-foreground size-5" />
                  </AvatarFallback>
                </Avatar>
                {canWrite && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Quitar avatar"
                    className="text-destructive hover:text-destructive absolute -top-1.5 -right-1.5 size-6 rounded-full shadow-sm"
                    onClick={() => setRemoveTarget(a)}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
    <ConfirmDialog
      open={!!removeTarget}
      onOpenChange={(o) => !o && setRemoveTarget(null)}
      title="Quitar avatar"
      description="Se quita este avatar del pool. Los bots ya generados que lo usen no cambian."
      destructive
      confirmLabel="Quitar"
      onConfirm={async () => {
        if (removeTarget) await remove.mutateAsync(removeTarget.id);
        toast.success('Avatar quitado');
      }}
    />
    </>
  );
}

function NamesCard({ canWrite }: { canWrite: boolean }) {
  const [country, setCountry] = useState('CR');
  const { data } = useNames(country);
  const { create, remove } = useNameMutations();
  const [name, setName] = useState('');
  const [removeTarget, setRemoveTarget] = useState<BotName | null>(null);

  async function add(): Promise<void> {
    try {
      await create.mutateAsync({ name, country });
      setName('');
      toast.success('Nombre agregado');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const names = data ?? [];

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TagIcon className="text-primary size-4" />
          Nombres por país
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-32" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canWrite && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name && !create.isPending) void add();
            }}
          >
            <Input
              placeholder="Nombre del bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={!name || create.isPending}>
              <PlusIcon className="size-4" /> Agregar
            </Button>
          </form>
        )}
        {names.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin nombres para {country}.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {names.map((n) => (
              <li
                key={n.id}
                className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm"
              >
                {n.name}
                {canWrite && (
                  <button
                    type="button"
                    aria-label={`Quitar ${n.name}`}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring inline-flex size-6 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => setRemoveTarget(n)}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
    <ConfirmDialog
      open={!!removeTarget}
      onOpenChange={(o) => !o && setRemoveTarget(null)}
      title="Quitar nombre"
      description={
        removeTarget ? `Se quita «${removeTarget.name}» de los nombres de ${removeTarget.country}.` : ''
      }
      destructive
      confirmLabel="Quitar"
      onConfirm={async () => {
        if (removeTarget) await remove.mutateAsync(removeTarget.id);
        toast.success('Nombre quitado');
      }}
    />
    </>
  );
}

export function PoolsTab({ canWrite }: { canWrite: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AvatarsCard canWrite={canWrite} />
      <NamesCard canWrite={canWrite} />
    </div>
  );
}
