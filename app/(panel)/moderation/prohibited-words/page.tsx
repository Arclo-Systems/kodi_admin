import { requireAction } from '@/lib/guard';
import { ProhibitedWordsManager } from './prohibited-words-manager';

export const metadata = { title: 'Palabras prohibidas' };

export default async function ProhibitedWordsPage() {
  await requireAction('moderation:prohibited-words');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Palabras prohibidas</h1>
        <p className="text-muted-foreground">
          Lista negra para el detector de nombres/títulos ofensivos. Se compara sin distinguir mayúsculas.
        </p>
      </div>
      <ProhibitedWordsManager />
    </div>
  );
}
