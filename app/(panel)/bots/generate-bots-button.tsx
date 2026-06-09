'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BotIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBotMutations, useTemplates } from '@/hooks/use-bots';
import { COUNTRIES } from '@/lib/countries';

export function GenerateBotsButton() {
  const { bulk } = useBotMutations();
  const { data: templates } = useTemplates();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState('CR');
  const [count, setCount] = useState(5);
  const [templateId, setTemplateId] = useState('');

  async function generate(): Promise<void> {
    try {
      await bulk.mutateAsync({ country, count, templateId });
      toast.success(`${count} bots generados`);
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <BotIcon className="size-4" /> Generar bots
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generación masiva de bots</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="b-country">País</FieldLabel>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="b-country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="b-count">Cantidad (máx 50)</FieldLabel>
            <Input
              id="b-count"
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="b-template">Plantilla</FieldLabel>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="b-template">
                <SelectValue placeholder="Elegí una plantilla" />
              </SelectTrigger>
              <SelectContent>
                {(templates ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={generate} disabled={!templateId || count < 1 || bulk.isPending}>
            {bulk.isPending ? 'Generando…' : 'Generar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
