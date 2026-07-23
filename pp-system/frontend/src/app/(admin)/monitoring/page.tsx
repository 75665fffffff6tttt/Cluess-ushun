"use client";
import ResourceModule from "@/components/ResourceModule";
import { useI18n } from "@/lib/i18n";
export default function Page() {
  const { t } = useI18n();
  return <ResourceModule title={t("monitoring")} endpoint="monitoring" module="monitoring"
    columns={[
      { key: "title", label: "Title" },
      { key: "region", label: "Region" },
      { key: "district", label: "District" },
      { key: "crop", label: "Crop" },
      { key: "severity", label: "Severity" },
      { key: "inspection_date", label: "Date" },
    ]}
    filters={[{ name: "severity", label: "Severity", options: ["low","medium","high"].map(v=>({value:v,label:v})) }]}
    fields={[
      { name: "title", label: "Title", required: true },
      { name: "inspection_date", label: "Inspection date", type: "date" },
      { name: "region", label: "Region" },
      { name: "district", label: "District" },
      { name: "crop", label: "Crop" },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
      { name: "area_ha", label: "Area (ha)", type: "number" },
      { name: "severity", label: "Severity", type: "select", options: ["low","medium","high"].map(v=>({value:v,label:v})) },
      { name: "recommendations", label: "Recommendations", type: "textarea" },
    ]} />;
}
