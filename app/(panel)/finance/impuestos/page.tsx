import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceTaxDeclarations } from '../finance-tax-declarations';
import { FinanceTaxRules } from '../finance-tax-rules';

export const metadata = { title: 'Impuestos · Finanzas' };

// Las dos mitades de la misma pregunta: con qué tasa se cobra y qué se declaró
// del mes. Separarlas en dos rutas obligaría a ir y volver para entender un
// número, así que van en pestañas de la misma pantalla.
export default async function FinanceTaxPage() {
  const user = await requireAction('view:finance');
  const canWrite = canWithScope(user.role, user.isGlobalScope, 'finance:write');

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Impuestos"
        description="Las tarifas con las que se cobra el impuesto y la declaración de IVA de cada mes, calculada desde el libro mayor."
      />

      <Tabs defaultValue="tarifas">
        <TabsList>
          <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
          <TabsTrigger value="declaraciones">Declaraciones de IVA</TabsTrigger>
        </TabsList>
        <TabsContent value="tarifas" className="pt-4">
          <FinanceTaxRules canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="declaraciones" className="pt-4">
          <FinanceTaxDeclarations canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
