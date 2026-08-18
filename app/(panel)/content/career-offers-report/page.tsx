import { requireAction } from '@/lib/guard';
import { CareerOffersReportView } from './career-offers-report-view';

export const metadata = { title: 'Reporte de universidades privadas' };

export default async function CareerOffersReportPage() {
  await requireAction('content:university:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reporte de universidades privadas</h1>
        <p className="text-muted-foreground">
          Aperturas del bottom sheet y clics a «Ir al sitio» por universidad, sumando todas sus
          ofertas en el período.
        </p>
      </div>
      <CareerOffersReportView />
    </div>
  );
}
