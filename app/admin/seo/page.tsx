"use client";
import { useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/admin/ui";

export default function SeoPage() {
  const [llmsTxt, setLlmsTxt] = useState("");

  useEffect(() => {
    fetch("/llms.txt").then((r) => r.text()).then(setLlmsTxt);
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="SEO" subtitle="Archivos técnicos y estado de indexación." />

      <div className="flex flex-col gap-3">
        <Panel className="p-4">
          <p className="text-xs font-bold text-slate-600 mb-2">Archivos técnicos en vivo</p>
          <div className="flex flex-col gap-1.5 text-xs">
            <a href="https://ropinder.vercel.app/robots.txt" target="_blank" rel="noreferrer" className="text-rose-500 hover:underline">/robots.txt →</a>
            <a href="https://ropinder.vercel.app/sitemap.xml" target="_blank" rel="noreferrer" className="text-rose-500 hover:underline">/sitemap.xml →</a>
            <a href="https://ropinder.vercel.app/llms.txt" target="_blank" rel="noreferrer" className="text-rose-500 hover:underline">/llms.txt →</a>
          </div>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold text-slate-600 mb-2">Contenido actual de /llms.txt</p>
          <p className="text-[11px] text-slate-400 mb-2">Es un archivo estático (public/llms.txt) — para cambiarlo hay que editar el código y redeployar, avisame qué querés que diga.</p>
          <pre className="text-[11px] text-slate-600 bg-slate-50 rounded-md p-3 whitespace-pre-wrap max-h-64 overflow-y-auto border border-slate-100">{llmsTxt || "Cargando..."}</pre>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold text-slate-600 mb-2">Estado</p>
          <ul className="text-xs text-slate-500 flex flex-col gap-1.5 list-disc list-inside">
            <li>Metadata y Open Graph configurados en el layout principal.</li>
            <li>La mayoría de las páginas (swipe, matches, perfil) requieren login, así que no son indexables — es esperado en un marketplace privado.</li>
            <li><code className="bg-slate-100 px-1 rounded">/login</code>, <code className="bg-slate-100 px-1 rounded">/signup</code> y <code className="bg-slate-100 px-1 rounded">/premium</code> son las páginas públicas indexables hoy.</li>
            <li>Si querés más páginas públicas indexables (por ejemplo, perfiles de vendedor en modo tienda), avisame y lo armamos.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
