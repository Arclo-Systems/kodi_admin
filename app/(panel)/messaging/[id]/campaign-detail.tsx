'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, BellIcon, EyeIcon, MailIcon, MegaphoneIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignForm } from '@/components/admin/campaign-form';
import { MessagePreview } from '@/components/admin/message-preview';
import { CampaignStatusBadge } from '@/lib/campaign-status';
import { useCampaign, type Campaign } from '@/hooks/use-messaging';

export function CampaignDetail({ id }: { id: string }) {
  const { data: campaign, isLoading, isError, error } = useCampaign(id);

  if (isLoading) return <LoadingState />;
  if (isError || !campaign) {
    return <ErrorState notFound={error instanceof Error && error.message === 'NOT_FOUND'} />;
  }

  // Solo los borradores broadcast son editables (el composer es de broadcast); el resto —
  // enviadas, en envío, 1-a-1, etc. — se muestra en solo lectura.
  const editable = campaign.status === 'draft' && campaign.kind === 'broadcast';

  return (
    <div className="space-y-6">
      <Header campaign={campaign} editable={editable} />
      {editable ? (
        <CampaignForm mode="edit" campaignId={campaign.id} initial={campaign} />
      ) : (
        <ReadOnlyView campaign={campaign} />
      )}
    </div>
  );
}

function Header({ campaign, editable }: { campaign: Campaign; editable: boolean }) {
  return (
    <div className="space-y-2">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link href="/messaging">
          <ArrowLeftIcon className="size-4" /> Volver a Mensajería
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{editable ? 'Editar borrador' : 'Campaña'}</h1>
        <CampaignStatusBadge status={campaign.status} />
        {!editable && <span className="text-muted-foreground text-sm">· Solo lectura</span>}
      </div>
      <p className="text-muted-foreground">
        {editable
          ? 'Modificá el contenido y guardá. El borrador se podrá enviar desde la lista.'
          : 'Esta campaña ya no es un borrador, por lo que se muestra en solo lectura.'}
      </p>
    </div>
  );
}

function ReadOnlyView({ campaign }: { campaign: Campaign }) {
  const isEmail = campaign.channel === 'email';
  const ChannelIcon = isEmail ? MailIcon : BellIcon;
  const recipients =
    campaign.kind === 'direct'
      ? (campaign.targetUser?.displayName ?? '—')
      : `${campaign.segment?.name ?? 'segmento'} (~${campaign.estimatedCount.toLocaleString('es-CR')})`;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MegaphoneIcon className="text-primary size-4" />
            Detalles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Field label="Tipo">{campaign.kind === 'direct' ? '1-a-1' : 'Broadcast'}</Field>
            <Field label="Canal">
              <span className="inline-flex items-center gap-1.5">
                <ChannelIcon className="text-muted-foreground size-4" />
                {isEmail ? 'Email' : 'Push'}
              </span>
            </Field>
            <Field label="Destinatarios">{recipients}</Field>
            <Field label="Resultado">
              <span className="tabular-nums">{campaign.sentCount.toLocaleString('es-CR')}</span>{' '}
              enviados ·{' '}
              <span className="tabular-nums">{campaign.failedCount.toLocaleString('es-CR')}</span>{' '}
              fallidos
            </Field>
            <Field label="Creada">{new Date(campaign.createdAt).toLocaleString('es-CR')}</Field>
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <EyeIcon className="text-info size-4" />
          Vista previa
        </h2>
        <MessagePreview
          channel={campaign.channel}
          subject={campaign.subject ?? ''}
          body={campaign.body}
          {...(isEmail && {
            headline: campaign.headline ?? '',
            assetUrl: campaign.assetUrl ?? '',
            ctaLabel: campaign.ctaLabel ?? '',
            ctaUrl: campaign.ctaUrl ?? '',
            secondaryText: campaign.secondaryText ?? '',
          })}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando campaña">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-[28rem] w-full" />
    </div>
  );
}

function ErrorState({ notFound }: { notFound: boolean }) {
  return (
    <div className="space-y-4 py-12 text-center" role="status">
      <p className="text-foreground font-medium">
        {notFound ? 'Campaña no encontrada' : 'No se pudo cargar la campaña'}
      </p>
      <p className="text-muted-foreground text-sm">
        {notFound
          ? 'Puede que se haya eliminado o el enlace sea incorrecto.'
          : 'Intentá de nuevo en un momento.'}
      </p>
      <Button variant="outline" asChild>
        <Link href="/messaging">
          <ArrowLeftIcon className="size-4" /> Volver a Mensajería
        </Link>
      </Button>
    </div>
  );
}
