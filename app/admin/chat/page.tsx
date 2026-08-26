"use client";
import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Panel, Badge, EmptyState } from "@/components/admin/ui";

interface Answer { id: string; text: string; order: number; active: boolean }
interface Question { id: string; text: string; order: number; active: boolean; answers: Answer[]; _count: { messages: number } }
interface Category { id: string; key: string; label: string; order: number; active: boolean; questions: Question[] }

const inputCls = "border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-200";

export default function ChatBankPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newCategoryKey, setNewCategoryKey] = useState("");
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newQuestionText, setNewQuestionText] = useState<Record<string, string>>({});
  const [newAnswerText, setNewAnswerText] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");

  const fetchTree = useCallback(async () => {
    const res = await fetch("/api/admin/chat/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.resolve().then(() => fetchTree());
  }, [user, fetchTree]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function patchJson(url: string, body: unknown) {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error ?? "Error"); return false; }
    return true;
  }

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error ?? "Error"); return null; }
    return data;
  }

  async function del(url: string) {
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error ?? "Error"); return false; }
    return true;
  }

  async function addCategory() {
    if (!newCategoryKey.trim() || !newCategoryLabel.trim()) return;
    setErr("");
    const created = await postJson("/api/admin/chat/categories", { key: newCategoryKey.trim(), label: newCategoryLabel.trim() });
    if (created) { setNewCategoryKey(""); setNewCategoryLabel(""); await fetchTree(); }
  }

  async function addQuestion(categoryId: string) {
    const text = newQuestionText[categoryId]?.trim();
    if (!text) return;
    setErr("");
    const created = await postJson("/api/admin/chat/questions", { categoryId, text });
    if (created) { setNewQuestionText((s) => ({ ...s, [categoryId]: "" })); await fetchTree(); }
  }

  async function addAnswer(questionId: string) {
    const text = newAnswerText[questionId]?.trim();
    if (!text) return;
    setErr("");
    const created = await postJson("/api/admin/chat/answers", { questionId, text });
    if (created) { setNewAnswerText((s) => ({ ...s, [questionId]: "" })); await fetchTree(); }
  }

  async function reorder(kind: "categories" | "questions" | "answers", list: { id: string; order: number }[], id: string, dir: -1 | 1) {
    const idx = list.findIndex((i) => i.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx], b = list[swapIdx];
    setErr("");
    await Promise.all([
      patchJson(`/api/admin/chat/${kind}/${a.id}`, { order: b.order }),
      patchJson(`/api/admin/chat/${kind}/${b.id}`, { order: a.order }),
    ]);
    await fetchTree();
  }

  if (!categories.length && user?.role === "ADMIN") {
    // still loading vs genuinely empty is ambiguous here on purpose — an
    // empty bank is a valid (if unlikely) admin-caused state, not an error
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Banco de preguntas"
        subtitle="Respuestas rápidas que los usuarios pueden tocar en el chat, antes de escribir texto libre. Se editan acá, sin tocar código."
      />

      {err && <p className="text-xs text-rose-500 mb-3">{err}</p>}

      <Panel className="p-4 mb-4">
        <p className="text-xs font-bold text-slate-600 mb-2">Nueva categoría</p>
        <div className="flex gap-2">
          <input value={newCategoryKey} onChange={(e) => setNewCategoryKey(e.target.value)} placeholder="key (ej: delivery)" className={`w-40 ${inputCls}`} />
          <input value={newCategoryLabel} onChange={(e) => setNewCategoryLabel(e.target.value)} placeholder="Nombre visible (ej: Entrega)" className={`flex-1 ${inputCls}`} />
          <button onClick={addCategory} className="text-xs font-semibold bg-slate-700 text-white rounded-md px-3 py-1.5 flex items-center gap-1">
            <Plus size={13} /> Crear
          </button>
        </div>
      </Panel>

      {categories.length === 0 ? (
        <Panel><EmptyState title="Sin categorías todavía" text="Creá la primera arriba." /></Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((cat, catIdx) => (
            <Panel key={cat.id} className="p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <button onClick={() => toggleExpanded(cat.id)} className="text-slate-400 hover:text-slate-700">
                  {expanded.has(cat.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <span className="text-sm font-semibold text-slate-800 flex-1">{cat.label}</span>
                <Badge>{cat.key}</Badge>
                {!cat.active && <Badge tone="slate">Inactiva</Badge>}
                <span className="text-[11px] text-slate-400">{cat.questions.length} pregunta{cat.questions.length !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => reorder("categories", categories, cat.id, -1)} disabled={catIdx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp size={14} /></button>
                  <button onClick={() => reorder("categories", categories, cat.id, 1)} disabled={catIdx === categories.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown size={14} /></button>
                  <button onClick={() => patchJson(`/api/admin/chat/categories/${cat.id}`, { active: !cat.active }).then(fetchTree)} className="text-slate-400 hover:text-slate-700 ml-1" title={cat.active ? "Desactivar" : "Activar"}>
                    {cat.active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => del(`/api/admin/chat/categories/${cat.id}`).then(fetchTree)} className="text-slate-400 hover:text-rose-500 ml-1"><Trash2 size={14} /></button>
                </div>
              </div>

              {expanded.has(cat.id) && (
                <div className="p-4 flex flex-col gap-3">
                  {cat.questions.map((q, qIdx) => (
                    <div key={q.id} className="border border-slate-100 rounded-md">
                      <div className="flex items-center gap-2 px-3 py-2 bg-white">
                        <button onClick={() => toggleExpanded(q.id)} className="text-slate-400 hover:text-slate-700">
                          {expanded.has(q.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <span className="text-xs font-medium text-slate-700 flex-1">{q.text}</span>
                        {!q.active && <Badge tone="slate">Inactiva</Badge>}
                        <span className="text-[10px] text-slate-400">{q.answers.length} resp.</span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => reorder("questions", cat.questions, q.id, -1)} disabled={qIdx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp size={12} /></button>
                          <button onClick={() => reorder("questions", cat.questions, q.id, 1)} disabled={qIdx === cat.questions.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown size={12} /></button>
                          <button onClick={() => patchJson(`/api/admin/chat/questions/${q.id}`, { active: !q.active }).then(fetchTree)} className="text-slate-400 hover:text-slate-700 ml-1">
                            {q.active ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                          <button onClick={() => del(`/api/admin/chat/questions/${q.id}`).then(fetchTree)} className="text-slate-400 hover:text-rose-500 ml-1"><Trash2 size={12} /></button>
                        </div>
                      </div>

                      {expanded.has(q.id) && (
                        <div className="px-3 pb-3 flex flex-col gap-1.5 bg-slate-50/50">
                          {q.answers.map((a, aIdx) => (
                            <div key={a.id} className="flex items-center gap-2 bg-white border border-slate-100 rounded px-2.5 py-1.5">
                              <span className="text-[11px] text-slate-600 flex-1">{a.text}</span>
                              {!a.active && <Badge tone="slate">Inactiva</Badge>}
                              <div className="flex items-center gap-0.5">
                                <button onClick={() => reorder("answers", q.answers, a.id, -1)} disabled={aIdx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp size={11} /></button>
                                <button onClick={() => reorder("answers", q.answers, a.id, 1)} disabled={aIdx === q.answers.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown size={11} /></button>
                                <button onClick={() => patchJson(`/api/admin/chat/answers/${a.id}`, { active: !a.active }).then(fetchTree)} className="text-slate-400 hover:text-slate-700 ml-1">
                                  {a.active ? <Eye size={11} /> : <EyeOff size={11} />}
                                </button>
                                <button onClick={() => del(`/api/admin/chat/answers/${a.id}`).then(fetchTree)} className="text-slate-400 hover:text-rose-500 ml-1"><Trash2 size={11} /></button>
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-1.5 mt-1">
                            <input value={newAnswerText[q.id] ?? ""} onChange={(e) => setNewAnswerText((s) => ({ ...s, [q.id]: e.target.value }))}
                              placeholder="Nueva respuesta..." className={`flex-1 ${inputCls}`} />
                            <button onClick={() => addAnswer(q.id)} className="text-[11px] font-semibold bg-slate-600 text-white rounded-md px-2.5 flex items-center gap-1"><Plus size={11} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-1.5">
                    <input value={newQuestionText[cat.id] ?? ""} onChange={(e) => setNewQuestionText((s) => ({ ...s, [cat.id]: e.target.value }))}
                      placeholder="Nueva pregunta..." className={`flex-1 ${inputCls}`} />
                    <button onClick={() => addQuestion(cat.id)} className="text-xs font-semibold bg-slate-700 text-white rounded-md px-3 py-1.5 flex items-center gap-1"><Plus size={12} /> Agregar</button>
                  </div>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
