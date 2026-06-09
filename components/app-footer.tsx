import { HeartIcon } from 'lucide-react';

export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="text-muted-foreground flex flex-col items-center justify-between gap-1 border-t px-6 py-4 text-xs sm:flex-row">
      <span>© {year} Kodi Inc. · Panel de administración</span>
      <span className="inline-flex items-center gap-1">
        Hecho con
        <HeartIcon className="text-destructive size-3.5 fill-current" role="img" aria-label="amor" />
        en Costa Rica
      </span>
    </footer>
  );
}
