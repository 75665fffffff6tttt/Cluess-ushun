"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export interface Field {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  required?: boolean;
}
export interface Column {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

interface Props {
  title: string;
  endpoint: string; // e.g. "pesticides"
  module: string; // permission prefix
  columns: Column[];
  fields: Field[];
  filters?: { name: string; label: string; options: { value: string; label: string }[] }[];
}

interface Paginated {
  data: Record<string, unknown>[];
  total: number;
  current_page: number;
  last_page: number;
}

export default function ResourceModule({ title, endpoint, module, columns, fields, filters }: Props) {
  const { can } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, last: 1 });
  const [q, setQ] = useState("");
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<null | Record<string, unknown>>(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 10 };
      if (q) params.q = q;
      Object.entries(filterVals).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await api.get<Paginated>(`/${endpoint}`, { params });
      setRows(data.data);
      setMeta({ total: data.total, page: data.current_page, last: data.last_page });
    } finally {
      setLoading(false);
    }
  }, [endpoint, q, filterVals]);

  useEffect(() => { load(1); }, [load]);

  const openCreate = () => { setFormErr(null); setModal({}); };
  const openEdit = (row: Record<string, unknown>) => { setFormErr(null); setModal({ ...row }); };

  const save = async () => {
    if (!modal) return;
    setSaving(true); setFormErr(null);
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => { payload[f.name] = modal[f.name] ?? (f.type === "checkbox" ? false : null); });
      if (modal.id) await api.put(`/${endpoint}/${modal.id}`, payload);
      else await api.post(`/${endpoint}`, payload);
      setModal(null);
      load(meta.page);
    } catch (e) {
      setFormErr(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: unknown) => {
    if (!confirm(t("confirm_delete"))) return;
    await api.delete(`/${endpoint}/${id}`);
    load(meta.page);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-[color:var(--text)]">{title}</h1>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">{meta.total}</span>
        {can(`${module}.create`) && (
          <button onClick={openCreate} className="ml-auto flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
            <Plus size={16} /> {t("create")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(1)}
            placeholder={t("search")}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] py-2 pl-9 pr-3 text-sm text-[color:var(--text)] outline-none focus:border-green-600"
          />
        </div>
        {filters?.map((f) => (
          <select key={f.name} value={filterVals[f.name] || ""} onChange={(e) => setFilterVals((v) => ({ ...v, [f.name]: e.target.value }))}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-sm text-[color:var(--text)]">
            <option value="">{f.label}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] text-left text-[color:var(--muted)]">
              {columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>)}
              <th className="px-4 py-3 font-medium text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-[color:var(--muted)]"><Loader2 className="mx-auto animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-[color:var(--muted)]">{t("no_data")}</td></tr>
            ) : rows.map((row) => (
              <tr key={String(row.id)} className="border-b border-[color:var(--border)] last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                {columns.map((c) => <td key={c.key} className="px-4 py-3 text-[color:var(--text)]">{c.render ? c.render(row) : String(row[c.key] ?? "—")}</td>)}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {can(`${module}.update`) && <button onClick={() => openEdit(row)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"><Pencil size={16} /></button>}
                    {can(`${module}.delete`) && <button onClick={() => remove(row.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta.last > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: meta.last }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => load(p)} className={`rounded px-3 py-1.5 text-sm ${p === meta.page ? "bg-green-700 text-white" : "border border-[color:var(--border)] text-[color:var(--text)]"}`}>{p}</button>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[color:var(--card)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[color:var(--text)]">{modal.id ? t("edit") : t("create")}</h2>
              <button onClick={() => setModal(null)}><X size={20} className="text-[color:var(--muted)]" /></button>
            </div>
            {formErr && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formErr}</div>}
            <div className="grid grid-cols-1 gap-3">
              {fields.map((f) => (
                <label key={f.name} className="block text-sm">
                  <span className="mb-1 block font-medium text-[color:var(--text)]">{f.label}{f.required && " *"}</span>
                  {f.type === "textarea" ? (
                    <textarea rows={3} value={String(modal[f.name] ?? "")} onChange={(e) => setModal({ ...modal, [f.name]: e.target.value })}
                      className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-[color:var(--text)] outline-none focus:border-green-600" />
                  ) : f.type === "select" ? (
                    <select value={String(modal[f.name] ?? "")} onChange={(e) => setModal({ ...modal, [f.name]: e.target.value })}
                      className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-[color:var(--text)]">
                      <option value="">—</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "checkbox" ? (
                    <input type="checkbox" checked={!!modal[f.name]} onChange={(e) => setModal({ ...modal, [f.name]: e.target.checked })} />
                  ) : (
                    <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={String(modal[f.name] ?? "")} onChange={(e) => setModal({ ...modal, [f.name]: e.target.value })}
                      className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-[color:var(--text)] outline-none focus:border-green-600" />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--text)]">{t("cancel")}</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
                {saving && <Loader2 size={16} className="animate-spin" />}{t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
