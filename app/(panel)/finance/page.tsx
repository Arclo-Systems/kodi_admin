import {
  ArrowLeftRightIcon,
  BarChart3Icon,
  BellRingIcon,
  BookOpenIcon,
  FileChartColumnIcon,
  GaugeIcon,
  LandmarkIcon,
  LayersIcon,
  ReceiptIcon,
  ScaleIcon,
  StoreIcon,
  TargetIcon,
  TrendingUpIcon,
  WalletIcon,
} from 'lucide-react';
import { SectionIndex, type SectionCard } from '@/components/admin/section-index';
import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { FinanceAlertsBanner } from './finance-alerts-banner';

// El orden es el del trabajo, no el alfabético: primero lo que se mira todos los
// días (resultado, movimientos, Play), después los reportes que salen del mayor,
// y al final lo que se configura una vez.
const AREAS: SectionCard[] = [
  {
    href: '/finance/dashboard',
    label: 'Dashboard',
    description: 'Ingresos, costos y gastos del período, calculados desde el libro mayor.',
    icon: BarChart3Icon,
    action: 'view:finance',
  },
  {
    href: '/finance/movimientos',
    label: 'Movimientos',
    description: 'Alta, edición y anulación de gastos e ingresos, cada uno con su asiento.',
    icon: ReceiptIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/play',
    label: 'Play',
    description: 'Órdenes de Google Play: qué cobró, qué se llevó de comisión y cuáles faltan asentar.',
    icon: StoreIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/mayor',
    label: 'Mayor',
    description: 'Los movimientos de una cuenta en una moneda, con su saldo corrido.',
    icon: BookOpenIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/comprobacion',
    label: 'Comprobación',
    description: 'Débitos contra créditos del período, con la diferencia siempre a la vista.',
    icon: ScaleIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/balance',
    label: 'Balance general',
    description: 'Activo, pasivo y patrimonio a una fecha, con la verificación del cuadre.',
    icon: FileChartColumnIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/flujo',
    label: 'Flujo de caja',
    description: 'Entradas y salidas de cada caja y banco, por moneda.',
    icon: WalletIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/presupuesto',
    label: 'Presupuesto',
    description: 'Lo que se pensaba gastar y cobrar cada mes, contra lo que dice el mayor.',
    icon: TargetIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/kpis',
    label: 'KPIs',
    description: 'Suscripciones, clientes, churn, ARPU, LTV y CAC del mes, con N/A cuando no hay dato.',
    icon: GaugeIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/proyeccion',
    label: 'Proyección',
    description: 'La recta de ingresos y gastos a 3, 6 o 12 meses, y la pista que aguanta la caja.',
    icon: TrendingUpIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/alertas',
    label: 'Alertas',
    description: 'Umbrales de pista de caja, sobregiro y órdenes sin asentar, y lo que dispararon.',
    icon: BellRingIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/cuentas',
    label: 'Cuentas',
    description: 'El plan de cuentas: el árbol contra el que se asienta todo.',
    icon: LandmarkIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/categorias',
    label: 'Categorías',
    description: 'Categorías de gasto e ingreso, y la cuenta contable de cada una.',
    icon: LayersIcon,
    action: 'view:finance',
  },
  {
    href: '/finance/tipos-de-cambio',
    label: 'Tipos de cambio',
    description: 'Tasas cargadas a mano, para las conversiones y el consolidado de los reportes.',
    icon: ArrowLeftRightIcon,
    action: 'view:finance',
  },
];

export const metadata = { title: 'Finanzas' };

export default async function FinanceHome() {
  const user = await requireAction('view:finance');
  const areas = AREAS.filter((area) => can(user.role, area.action));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Finanzas</h1>
        <p className="text-muted-foreground">
          Contabilidad de la empresa por partida doble: los reportes salen del libro mayor, no de un
          agregado aparte. Los ingresos incluyen las facturas de sponsor pagadas.
        </p>
      </div>

      {/* El canal principal de las alertas es este banner: sin correo a admins,
          una alerta que solo vive en su pantalla no la ve nadie. */}
      <FinanceAlertsBanner />

      <SectionIndex cards={areas} />
    </div>
  );
}
