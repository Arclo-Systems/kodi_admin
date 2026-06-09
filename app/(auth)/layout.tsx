import type { ReactNode } from 'react';

// Passthrough: cada page de auth define su propio layout (login = two-column full-bleed,
// change-password = card centrado).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="bg-background min-h-svh">{children}</div>;
}
