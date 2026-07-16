import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppNav } from "@/components/AppNav";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://ropinder.vercel.app"),
  title: "Ropinder – Intercambiá y vendé ropa cerca tuyo",
  description: "Publicá tus prendas, hacé match por swipe con gente cerca tuyo, y coordiná el intercambio o la venta con pago protegido en custodia.",
  keywords: ["ropa usada", "intercambio de ropa", "venta de ropa", "segunda mano", "marketplace ropa", "swipe ropa"],
  openGraph: {
    title: "Ropinder – Intercambiá y vendé ropa cerca tuyo",
    description: "Publicá tus prendas, hacé match por swipe con gente cerca tuyo, y coordiná el intercambio o la venta con pago protegido en custodia.",
    type: "website",
    locale: "es_AR",
    siteName: "Ropinder",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${geist.className} min-h-full bg-slate-50`}>
        <AuthProvider>
          <AppNav />
          <main className="pb-20">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
