import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppNav } from "@/components/AppNav";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ropinder – Tinder para ropa",
  description: "Intercambiá ropa cerca tuyo con swipes",
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
