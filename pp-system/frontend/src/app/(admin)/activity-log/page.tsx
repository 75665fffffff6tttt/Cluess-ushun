"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
interface Log { id:number; action:string; description:string; ip_address:string; created_at:string; user?:{name:string} }
export default function Page() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Log[]>([]);
  useEffect(() => { api.get("/activity-logs", { params: { per_page: 30 } }).then(r => setRows(r.data.data)); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[color:var(--text)]">{t("activity_log")}</h1>
      <div className="overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
        <table className="w-full min-w-[600px] text-sm">
          <thead><tr className="border-b border-[color:var(--border)] text-left text-[color:var(--muted)]">
            <th className="px-4 py-3">Action</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">IP</th><th className="px-4 py-3">Time</th>
          </tr></thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.id} className="border-b border-[color:var(--border)] last:border-0">
                <td className="px-4 py-2.5"><span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">{l.action}</span></td>
                <td className="px-4 py-2.5 text-[color:var(--text)]">{l.user?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-[color:var(--text)]">{l.description}</td>
                <td className="px-4 py-2.5 text-[color:var(--muted)]">{l.ip_address}</td>
                <td className="px-4 py-2.5 text-[color:var(--muted)]">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
