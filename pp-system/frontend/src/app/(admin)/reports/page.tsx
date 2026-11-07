"use client";
import ResourceModule from "@/components/ResourceModule";
import { useI18n } from "@/lib/i18n";
export default function Page() {
  const { t } = useI18n();
  return <ResourceModule title={t("reports")} endpoint="reports" module="reports"
    columns={[
      { key: "title", label: "Title" },
      { key: "report_type", label: "Type" },
      { key: "period_start", label: "From" },
      { key: "period_end", label: "To" },
    ]}
    filters={[{ name: "report_type", label: "Type", options: ["daily","weekly","monthly","yearly"].map(v=>({value:v,label:v})) }]}
    fields={[
      { name: "title", label: "Title", required: true },
      { name: "report_type", label: "Type", type: "select", required: true, options: ["daily","weekly","monthly","yearly"].map(v=>({value:v,label:v})) },
      { name: "period_start", label: "Period start", type: "date" },
      { name: "period_end", label: "Period end", type: "date" },
      { name: "summary", label: "Summary", type: "textarea" },
    ]} />;
}
