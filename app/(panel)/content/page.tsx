import Link from 'next/link';
import {
  BotIcon,
  CompassIcon,
  FileQuestionIcon,
  FolderTreeIcon,
  GraduationCapIcon,
  ListChecksIcon,
  NewspaperIcon,
  SparklesIcon,
} from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAction } from '@/lib/guard';
import { can, type Action } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const ICON_TONES = [
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-warning/10 text-warning',
  'bg-success/10 text-success',
];

type AreaCard = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  action: Action;
};

const AREAS: AreaCard[] = [
  {
    href: '/content/questions',
    label: 'Preguntas',
    description: 'Banco de preguntas, workflow draft→activa, bulk CSV y generación con IA.',
    icon: FileQuestionIcon,
    action: 'view:content',
  },
  {
    href: '/content/modules-tree',
    label: 'Temas y módulos',
    description: 'Árbol de módulos, materias y temas con reordenamiento.',
    icon: FolderTreeIcon,
    action: 'view:content',
  },
  {
    href: '/content/news',
    label: 'Noticias',
    description: 'Artículos en Markdown, programación y publicación.',
    icon: NewspaperIcon,
    action: 'view:content',
  },
  {
    href: '/content/admission-cutoffs',
    label: 'Cortes de admisión',
    description: 'Subida de CSV con validación editor → admin.',
    icon: GraduationCapIcon,
    action: 'view:content',
  },
  {
    href: '/content/ai-prompts',
    label: 'AI Prompts',
    description: 'Prompts del tutor IA, versionado y playground.',
    icon: BotIcon,
    action: 'view:content',
  },
  {
    href: '/content/careers',
    label: 'Test Vocacional',
    description: 'Carreras PAA: catálogo + carga masiva por CSV (editor → admin), RIASEC y OLaP.',
    icon: CompassIcon,
    action: 'content:career:upload',
  },
  {
    href: '/content/vocational-items',
    label: 'Ítems del test vocacional',
    description: 'Banco de enunciados RIASEC (Holland) del test, por dimensión.',
    icon: ListChecksIcon,
    action: 'content:vocational:write',
  },
  {
    href: '/content/riasec-types',
    label: 'Perfiles de tipos RIASEC',
    description: 'Los 6 tipos base (Holland) que se muestran en el resultado del test.',
    icon: SparklesIcon,
    action: 'content:vocational:write',
  },
];

export const metadata = { title: 'Contenido' };

export default async function ContentHome() {
  const user = await requireAction('view:content');
  const areas = AREAS.filter((area) => can(user.role, area.action));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contenido</h1>
        <p className="text-muted-foreground">Gestión del contenido educativo de Kodi</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area, i) => (
          <Link
            key={area.href}
            href={area.href}
            className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
          >
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader>
                <div
                  className={cn(
                    'mb-3 flex size-10 items-center justify-center rounded-lg',
                    ICON_TONES[i % ICON_TONES.length],
                  )}
                >
                  <area.icon className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-base">{area.label}</CardTitle>
                <CardDescription>{area.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
