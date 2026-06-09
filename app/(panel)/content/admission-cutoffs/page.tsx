import { requireAction } from '@/lib/guard';
import { CutoffsTable } from './cutoffs-table';

export const metadata = { title: 'Cortes de admisión' };

export default async function AdmissionCutoffsPage() {
  await requireAction('content:cutoffs:upload');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cortes de admisión</h1>
        <p className="text-muted-foreground">
          Subí CSV por módulo y año; un admin valida el diff antes de aplicarlo.
        </p>
      </div>
      <CutoffsTable />
    </div>
  );
}
