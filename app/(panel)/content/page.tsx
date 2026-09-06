import {
  BarChart3Icon,
  BotIcon,
  CompassIcon,
  FileQuestionIcon,
  FolderTreeIcon,
  GraduationCapIcon,
  LayersIcon,
  ListChecksIcon,
  NewspaperIcon,
  SparklesIcon,
} from 'lucide-react';
import { SectionIndex, type SectionCard } from '@/components/admin/section-index';
import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';

const AREAS: SectionCard[] = [
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
    href: '/content/review-material',
    label: 'Material de repaso',
    description: 'Tarjetas, resúmenes y podcasts por tema: borradores con IA o a mano, y publicación por pieza.',
    icon: LayersIcon,
    action: 'content:review-material:write',
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
    href: '/content/universities',
    label: 'Universidades',
    description: 'Pesos de admisión y escalas por universidad.',
    icon: GraduationCapIcon,
    action: 'content:university:write',
  },
  {
    href: '/content/career-offers-report',
    label: 'Reporte de privadas',
    description:
      'Aperturas de ficha y clics al sitio por universidad privada, para reportarle al anunciante.',
    icon: BarChart3Icon,
    action: 'content:university:write',
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

      <SectionIndex cards={areas} />
    </div>
  );
}
