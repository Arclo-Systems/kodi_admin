import { requireAction } from '@/lib/guard';
import { FeaturesBoard } from './features-board';

export const metadata = { title: 'Features' };

export default async function FeaturesPage() {
  await requireAction('view:features');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Features / Ideas</h1>
        <p className="text-muted-foreground">Roadmap interno de producto.</p>
      </div>
      <FeaturesBoard />
    </div>
  );
}
