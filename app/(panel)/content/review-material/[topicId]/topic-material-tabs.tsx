'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditTrail } from '@/components/admin/audit-trail';
import { useReviewMaterialOverview } from '@/hooks/use-review-material';
import { FlashcardsTab } from './flashcards-tab';
import { SummaryTab } from './summary-tab';
import { PodcastTab } from './podcast-tab';

export function TopicMaterialTabs({
  topicId,
  canPublish,
}: {
  topicId: string;
  canPublish: boolean;
}) {
  // Reusa la query del índice (misma queryKey): el nombre del tema sale del árbol
  // que el panel ya cargó, sin un endpoint de detalle solo para el encabezado.
  const { data } = useReviewMaterialOverview(null);
  const location = findTopic(data ?? [], topicId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{location?.topicName ?? 'Material del tema'}</h1>
          <p className="text-muted-foreground">
            {location
              ? `${location.moduleName} · ${location.subjectName}`
              : 'Tarjetas, resumen y podcast de este tema'}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/content/review-material">
            <ArrowLeftIcon className="size-4" />
            Volver al árbol
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="flashcards">
        <TabsList>
          <TabsTrigger value="flashcards">Tarjetas</TabsTrigger>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="podcast">Podcast</TabsTrigger>
        </TabsList>
        <TabsContent value="flashcards" className="mt-4">
          <FlashcardsTab topicId={topicId} canPublish={canPublish} />
        </TabsContent>
        <TabsContent value="summary" className="mt-4">
          <SummaryTab topicId={topicId} canPublish={canPublish} />
        </TabsContent>
        <TabsContent value="podcast" className="mt-4">
          <PodcastTab topicId={topicId} canPublish={canPublish} />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTrail resourceType="Topic" resourceId={topicId} />
        </CardContent>
      </Card>
    </div>
  );
}

function findTopic(
  modules: { shortName: string; subjects: { name: string; topics: { id: string; name: string }[] }[] }[],
  topicId: string,
): { moduleName: string; subjectName: string; topicName: string } | null {
  for (const examModule of modules) {
    for (const subject of examModule.subjects) {
      const topic = subject.topics.find((t) => t.id === topicId);
      if (topic) {
        return {
          moduleName: examModule.shortName,
          subjectName: subject.name,
          topicName: topic.name,
        };
      }
    }
  }
  return null;
}
