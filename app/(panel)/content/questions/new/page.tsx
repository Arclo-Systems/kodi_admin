import { requireAction } from '@/lib/guard';
import { QuestionForm } from '../question-form';

export const metadata = { title: 'Nueva pregunta' };

export default async function NewQuestionPage() {
  await requireAction('content:question:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva pregunta</h1>
        <p className="text-muted-foreground">Entra como borrador hasta enviarla a revisión.</p>
      </div>
      <QuestionForm mode="create" />
    </div>
  );
}
