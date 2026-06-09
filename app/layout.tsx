import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Única fuente del panel (marca Kodi). Se expone como --font-sans (lo lee @theme en globals.css).
const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const DESCRIPTION =
  "Acceso restringido. Panel interno de Kodi para gestionar usuarios, contenido, economía y operaciones. Uso confidencial de Arclo Systems.";

export const metadata: Metadata = {
  // Resuelve las URLs absolutas de la imagen OG. En Vercel usa el dominio de producción;
  // en local, localhost.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3001",
  ),
  title: { default: "Kodi Inc.", template: "%s · Kodi Inc." },
  description: DESCRIPTION,
  icons: { icon: "/favicon.ico" },
  // Panel interno: nunca se indexa (refuerza el X-Robots-Tag de next.config y robots.txt).
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Kodi",
    title: "Kodi · Panel de administración",
    description: DESCRIPTION,
    locale: "es_CR",
    images: [
      { url: "/open-graph.png", width: 1200, height: 630, alt: "Panel de administración de Kodi" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kodi · Panel de administración",
    description: DESCRIPTION,
    images: ["/open-graph.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#141f25" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={poppins.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
