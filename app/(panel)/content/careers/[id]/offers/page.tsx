import { requireAction } from '@/lib/guard';
import { CareerDetailNav } from '../career-detail-nav';
import { CareerOffersManager } from './career-offers-manager';

export const metadata = { title: 'Universidades privadas' };

export default async function CareerOffersPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('content:career:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Universidades privadas</h1>
        <p className="text-muted-foreground">
          Ofertas promocionales que la app muestra en «Dónde estudiarla», debajo de las públicas con
          corte y en este orden.
        </p>
      </div>
      <CareerDetailNav careerId={id} />
      <CareerOffersManager careerId={id} />
    </div>
  );
}
