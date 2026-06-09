import { requireAction } from '@/lib/guard';
import { QuestionDetail } from '../question-detail';

export const metadata = { title: 'Editar pregunta' };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAction('content:question:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar pregunta</h1>
        <p className="text-muted-foreground">Revisa, edita y avanza el estado de la pregunta.</p>
      </div>
      <QuestionDetail id={id} role={user.role} />
    </div>
  );
}
