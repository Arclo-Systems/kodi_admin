'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ActivityIcon,
  ArrowLeftIcon,
  CircleOffIcon,
  CircleXIcon,
  FileTextIcon,
  FolderIcon,
  HandshakeIcon,
  ImageIcon,
  MapPinIcon,
  PencilIcon,
  ReceiptIcon,
  StickyNoteIcon,
  TargetIcon,
  TicketIcon,
  TrophyIcon,
  VideoIcon,
  type LucideIcon,
} from 'lucide-react';
import { useSponsor, PIPELINE_LABELS, type PipelineStatus } from '@/hooks/use-sponsors';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import { COUNTRIES } from '@/lib/countries';
import { KpiCard } from '@/components/admin/kpi-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SponsorNotesTab } from './sponsor-notes-tab';
import { SponsorDocumentsTab } from './sponsor-documents-tab';
import { SponsorTimelineTab } from './sponsor-timeline-tab';
import { SponsorInvoicesTab } from './sponsor-invoices-tab';
import { SponsorBranchesTab } from './sponsor-branches-tab';

const PIPELINE_FARO: Record<PipelineStatus, { tone: StatusTone; icon: LucideIcon }> = {
  prospect: { tone: 'info', icon: TargetIcon },
  active: { tone: 'success', icon: HandshakeIcon },
  lost: { tone: 'destructive', icon: CircleXIcon },
};

function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-semibold break-all">{children}</span>
    </div>
  );
}

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('es-CR') : '—';
}

export function SponsorDetail({ id, role }: { id: string; role: AdminRole }) {
  const { data: s, isLoading } = useSponsor(id);
  const canWrite = can(role, 'economy:sponsor:write');

  if (!isLoading && !s) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">No se encontró el sponsor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {s?.logoUrl ? (
            <Image
              src={s.logoUrl}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-md border object-contain"
              unoptimized
            />
          ) : (
            s && (
              <div className="bg-muted grid size-12 place-items-center rounded-md font-medium">
                {s.name.slice(0, 2).toUpperCase()}
              </div>
            )
          )}
          <div className="space-y-1">
            <BackLink />
            <h1 className="text-2xl font-semibold">
              {s?.name ?? <Skeleton className="h-7 w-48" />}
            </h1>
            {s && (
              <div className="text-muted-foreground flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={PIPELINE_FARO[s.pipelineStatus].tone}
                  icon={PIPELINE_FARO[s.pipelineStatus].icon}
                  label={PIPELINE_LABELS[s.pipelineStatus]}
                />
                <span>{s.country ? `${s.country} · ${countryLabel(s.country)}` : 'Multi-país'}</span>
                {!s.isActive && <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />}
              </div>
            )}
          </div>
        </div>
        {canWrite && s && (
          <Button asChild size="sm">
            <Link href={`/economy/sponsors/${id}/edit`}>
              <PencilIcon className="size-4" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      {s?._count && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Banners" value={s._count.banners} icon={<ImageIcon />} tone="teal" />
          <KpiCard label="Cupones" value={s._count.coupons} icon={<TicketIcon />} tone="green" />
          <KpiCard
            label="Premiaciones"
            value={s._count.raffles}
            icon={<TrophyIcon />}
            tone="amber"
          />
          <KpiCard label="Videos" value={s._count.videos ?? 0} icon={<VideoIcon />} tone="blue" />
        </div>
      )}

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">
            <FileTextIcon className="size-4" />
            Datos
          </TabsTrigger>
          <TabsTrigger value="sucursales">
            <MapPinIcon className="size-4" />
            Sucursales
          </TabsTrigger>
          <TabsTrigger value="notas">
            <StickyNoteIcon className="size-4" />
            Notas
          </TabsTrigger>
          <TabsTrigger value="documentos">
            <FolderIcon className="size-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <ActivityIcon className="size-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="facturas">
            <ReceiptIcon className="size-4" />
            Facturas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Card>
            <CardContent>
              {s ? (
                <dl className="[&>div:last-child]:border-b-0">
                  <DetailRow label="Sitio web">
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {s.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                  <DetailRow label="Contacto">{s.contactName ?? '—'}</DetailRow>
                  <DetailRow label="Email contacto">{s.contactEmail ?? '—'}</DetailRow>
                  <DetailRow label="Teléfono">{s.contactPhone ?? '—'}</DetailRow>
                  <DetailRow label="Razón social">{s.legalName ?? '—'}</DetailRow>
                  <DetailRow label="Cédula jurídica">{s.taxId ?? '—'}</DetailRow>
                  <DetailRow label="Email facturación">{s.billingEmail ?? '—'}</DetailRow>
                  <DetailRow label="Moneda / IVA">
                    {s.currency} · {s.appliesIva ? 'con IVA' : 'sin IVA'}
                  </DetailRow>
                  <DetailRow label="Color de marca">
                    {s.brandColor ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block size-4 rounded border"
                          style={{ backgroundColor: s.brandColor }}
                        />
                        {s.brandColor}
                      </span>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                  <DetailRow label="Contrato">
                    {fmtDate(s.contractStartsAt)} – {fmtDate(s.contractEndsAt)}
                  </DetailRow>
                </dl>
              ) : (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sucursales">
          <SponsorBranchesTab sponsorId={id} />
        </TabsContent>
        <TabsContent value="notas">
          <SponsorNotesTab sponsorId={id} />
        </TabsContent>
        <TabsContent value="documentos">
          <SponsorDocumentsTab sponsorId={id} />
        </TabsContent>
        <TabsContent value="timeline">
          <SponsorTimelineTab sponsorId={id} />
        </TabsContent>
        <TabsContent value="facturas">
          <SponsorInvoicesTab sponsorId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/economy/sponsors"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeftIcon className="size-3" />
      Sponsors
    </Link>
  );
}
