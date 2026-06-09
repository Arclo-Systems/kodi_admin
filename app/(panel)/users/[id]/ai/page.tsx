import { ActivityIcon, CalendarDaysIcon, SparklesIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminFetch } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';

type Ai = {
  latestPrediction: { computedAt: string } | null;
  latestDailyPlan: { createdAt: string } | null;
  recentDiagnostics: { id: string; createdAt: string }[];
};

export default async function AiTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await adminFetch(`/v1/admin/users/${id}/ai`);
  const ai = unwrapData<Ai>(await res.json());

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <SparklesIcon className="text-info size-4" />
            Última predicción de nota
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {ai?.latestPrediction
            ? new Date(ai.latestPrediction.computedAt).toLocaleString('es')
            : 'Sin predicciones'}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarDaysIcon className="text-info size-4" />
            Último plan diario IA
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {ai?.latestDailyPlan
            ? new Date(ai.latestDailyPlan.createdAt).toLocaleString('es')
            : 'Sin plan'}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ActivityIcon className="text-info size-4" />
            Diagnósticos recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {ai?.recentDiagnostics.length ?? 0} registrados
        </CardContent>
      </Card>
    </div>
  );
}
