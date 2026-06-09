import { requireAction } from '@/lib/guard';
import { PromoOffersManager } from './promo-offers-manager';

export const metadata = { title: 'Ofertas' };

export default async function PromoOffersPage() {
  await requireAction('economy:subscription-price:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ofertas (Fundador)</h1>
        <p className="text-muted-foreground">
          Ofertas de lanzamiento por país: cupos limitados, ventana opcional, precio en tabla propia o
          % de descuento, e insignia. La oferta aplica al precio de la <strong>primera compra</strong> y
          otorga la insignia. La app ya muestra el banner; acá se configura.
        </p>
      </div>
      <PromoOffersManager />
    </div>
  );
}
