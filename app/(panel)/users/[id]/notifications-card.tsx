'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BellIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { UserDetail } from '@/lib/user-detail';

// Toggles visibles (las internas duel_your_turn/mission_completed no se muestran).
const NOTIFICATION_LABELS: { key: string; label: string; default: boolean }[] = [
  { key: 'daily_goal_reminder', label: 'Recordatorio de meta diaria', default: true },
  { key: 'streak_reminder', label: 'Racha en riesgo', default: true },
  { key: 'league_updates', label: 'Ascenso y descenso de liga', default: true },
  { key: 'surprise_exam', label: 'Examen sorpresa', default: true },
  { key: 'friend_requests', label: 'Solicitudes de amistad', default: true },
  { key: 'friend_streak_invites', label: 'Invitaciones de racha', default: true },
  { key: 'friend_activity', label: 'Hitos de amigos', default: false },
  { key: 'news_promos', label: 'Novedades y promociones', default: true },
];

export function NotificationsCard({ user }: { user: UserDetail }) {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NOTIFICATION_LABELS.map((n) => [n.key, user.notificationSettings[n.key] ?? n.default]),
    ),
  );
  const [reminderHour, setReminderHour] = useState<string>(
    user.reminderHour === null ? '' : String(user.reminderHour),
  );
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const hourNum = reminderHour === '' ? null : Number(reminderHour);
  const hourValid = hourNum === null || (Number.isInteger(hourNum) && hourNum >= 0 && hourNum <= 23);
  const canSave = reason.trim().length >= 3 && hourValid && !saving;

  async function save(): Promise<void> {
    setSaving(true);
    const payload: Record<string, unknown> = {
      notificationSettings: settings,
      reason: reason.trim(),
    };
    if (hourNum !== null) payload.reminderHour = hourNum;

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      toast.error(data?.error?.message ?? 'Error guardando las notificaciones');
      return;
    }
    toast.success('Notificaciones actualizadas');
    setReason('');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellIcon className="text-primary size-4" />
          Notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-border divide-y">
          {NOTIFICATION_LABELS.map((n) => (
            <div key={n.key} className="flex items-center justify-between py-2.5">
              <label htmlFor={`notif-${n.key}`} className="text-sm">
                {n.label}
              </label>
              <Switch
                id={`notif-${n.key}`}
                checked={settings[n.key]}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, [n.key]: v }))}
              />
            </div>
          ))}
        </div>

        <Field>
          <FieldLabel htmlFor="notif-hour">Hora del recordatorio (0–23, vacío = sin hora)</FieldLabel>
          <Input
            id="notif-hour"
            type="number"
            min={0}
            max={23}
            value={reminderHour}
            onChange={(e) => setReminderHour(e.target.value)}
            className="w-28"
            aria-invalid={!hourValid}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="notif-reason">Motivo del cambio</FieldLabel>
          <Textarea
            id="notif-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mínimo 3 caracteres"
          />
        </Field>

        <Button onClick={save} disabled={!canSave}>
          {saving ? 'Guardando…' : 'Guardar notificaciones'}
        </Button>
      </CardContent>
    </Card>
  );
}
