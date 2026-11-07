"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Users, SprayCan, Bug, Leaf, Sprout, FlaskConical, MapPin, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Stats {
  counts: Record<string, number>;
  charts: {
    pesticides_by_type: Record<string, number>;
    monitoring_trend: { month: string; total: number }[];
    monitoring_severity: Record<string, number>;
  };
  recent_activities: { id: number; action: string; description: string; created_at: string; user?: { name: string } }[];
}

const CARDS = [
  { key: "users", i18n: "users", icon: Users, color: "bg-blue-600" },
  { key: "pesticides", i18n: "pesticides", icon: SprayCan, color: "bg-green-600" },
  { key: "pests", i18n: "pests", icon: Bug, color: "bg-amber-600" },
  { key: "diseases", i18n: "diseases", icon: Leaf, color: "bg-red-600" },
  { key: "weeds", i18n: "weeds", icon: Sprout, color: "bg-lime-600" },
  { key: "lab_samples", i18n: "laboratory", icon: FlaskConical, color: "bg-purple-600" },
  { key: "monitorings", i18n: "monitoring", icon: MapPin, color: "bg-teal-600" },
  { key: "reports", i18n: "reports", icon: FileText, color: "bg-indigo-600" },
];

export default function DashboardPage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => setErr("Yuklashda xatolik"));
  }, []);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!stats) return <div className="text-[color:var(--muted)]">{t("loading")}</div>;

  const chartTheme = { mode: theme, foreColor: theme === "dark" ? "#93a1b0" : "#5b6b63" } as const;
  const typeLabels = Object.keys(stats.charts.pesticides_by_type);
  const typeValues = Object.values(stats.charts.pesticides_by_type);
  const sevLabels = Object.keys(stats.charts.monitoring_severity);
  const sevValues = Object.values(stats.charts.monitoring_severity);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[color:var(--text)]">{t("dashboard")}</h1>

      {/* Count cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="flex items-center gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-white ${c.color}`}>
                <Icon size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-[color:var(--text)]">{stats.counts[c.key] ?? 0}</div>
                <div className="text-xs text-[color:var(--muted)]">{t(c.i18n)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-[color:var(--text)]">{t("pesticides")} — turlar bo'yicha</h3>
          {typeValues.length ? (
            <Chart type="donut" height={280}
              series={typeValues}
              options={{ labels: typeLabels, legend: { position: "bottom" }, theme: chartTheme,
                colors: ["#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed"] }} />
          ) : <Empty t={t} />}
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-[color:var(--text)]">{t("monitoring")} — 6 oy</h3>
          {stats.charts.monitoring_trend.length ? (
            <Chart type="area" height={280}
              series={[{ name: t("monitoring"), data: stats.charts.monitoring_trend.map((m) => m.total) }]}
              options={{ chart: { toolbar: { show: false } }, theme: chartTheme, colors: ["#16a34a"],
                xaxis: { categories: stats.charts.monitoring_trend.map((m) => m.month) }, dataLabels: { enabled: false },
                stroke: { curve: "smooth", width: 2 } }} />
          ) : <Empty t={t} />}
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-[color:var(--text)]">{t("monitoring")} — xavf darajasi</h3>
          {sevValues.length ? (
            <Chart type="bar" height={280}
              series={[{ name: t("monitoring"), data: sevValues }]}
              options={{ chart: { toolbar: { show: false } }, theme: chartTheme, colors: ["#dc2626"],
                xaxis: { categories: sevLabels }, plotOptions: { bar: { borderRadius: 4, columnWidth: "45%" } },
                dataLabels: { enabled: false } }} />
          ) : <Empty t={t} />}
        </div>

        {/* Recent activities */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-[color:var(--text)]">{t("latest_activities")}</h3>
          <ul className="divide-y divide-[color:var(--border)]">
            {stats.recent_activities.length ? stats.recent_activities.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[color:var(--text)]">
                  <span className="mr-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">{a.action}</span>
                  {a.description}
                </span>
                <span className="whitespace-nowrap text-xs text-[color:var(--muted)]">
                  {a.user?.name ?? "—"} · {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            )) : <Empty t={t} />}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Empty({ t }: { t: (k: string) => string }) {
  return <div className="py-8 text-center text-sm text-[color:var(--muted)]">{t("no_data")}</div>;
}
