import Image from 'next/image';
import type { ModuleIdentity } from '@/lib/user-detail';

// `unoptimized`: el arte vive en R2 y el optimizador de Next exigiría declarar
// el host en `images.remotePatterns` — mismo trato que el resto del panel
// (`components/admin/asset-upload.tsx`).
function ModuleArt({ module }: { module: ModuleIdentity }) {
  const src = module.iconUrl ?? module.characterUrl;
  if (!src) {
    // Un módulo sin arte cargado no puede dejar un hueco: la inicial mantiene
    // el chip legible y le dice al admin que le falta subir el ícono.
    return (
      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg text-sm font-semibold">
        {module.shortName.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={module.shortName}
      width={40}
      height={40}
      className="size-10 rounded-lg object-cover"
      unoptimized
    />
  );
}

/**
 * Módulos registrados del usuario. Identidad (arte y color) 100% del wire: antes
 * salía de un mapa local por `examType` y todo examen nuevo aparecía sin ícono.
 */
export function ModuleChips({
  modules,
  activeModule,
}: {
  modules: ModuleIdentity[];
  activeModule: ModuleIdentity | null;
}) {
  if (modules.length === 0) {
    return <p className="text-muted-foreground text-sm">Sin módulos registrados.</p>;
  }
  return (
    <div className="flex flex-wrap gap-3">
      {modules.map((module) => {
        const active = module.examType === activeModule?.examType;
        return (
          <div
            key={module.examType}
            title={module.fullName}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 pr-4 ${
              active ? '' : 'border-border'
            }`}
            style={
              active
                ? {
                    borderColor: module.colorHex,
                    backgroundColor: `${module.colorHex}14`,
                  }
                : undefined
            }
          >
            <ModuleArt module={module} />
            <div className="min-w-0">
              <div className="text-sm font-medium">{module.shortName}</div>
              {active && (
                <div className="text-xs font-medium" style={{ color: module.colorHex }}>
                  Activo
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
