import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EventsTab() {
  return (
    <Alert>
      <AlertDescription>
        El visor de eventos PostHog llega en una ola posterior. Por ahora, consultá directamente en
        PostHog.
      </AlertDescription>
    </Alert>
  );
}
