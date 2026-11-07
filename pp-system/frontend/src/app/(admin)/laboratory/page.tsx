"use client";
import ResourceModule from "@/components/ResourceModule";
import { useI18n } from "@/lib/i18n";
export default function Page() {
  const { t } = useI18n();
  return <ResourceModule title={t("laboratory")} endpoint="lab-samples" module="lab"
    columns={[
      { key: "sample_code", label: "Sample code" },
      { key: "sample_type", label: "Type" },
      { key: "crop", label: "Crop" },
      { key: "region", label: "Region" },
      { key: "status", label: "Status" },
    ]}
    filters={[{ name: "status", label: "Status", options: ["registered","in_analysis","completed"].map(v=>({value:v,label:v})) }]}
    fields={[
      { name: "sample_code", label: "Sample code", required: true },
      { name: "sample_type", label: "Sample type" },
      { name: "crop", label: "Crop" },
      { name: "region", label: "Region" },
      { name: "district", label: "District" },
      { name: "submitted_by", label: "Submitted by" },
      { name: "received_date", label: "Received date", type: "date" },
      { name: "status", label: "Status", type: "select", options: ["registered","in_analysis","completed"].map(v=>({value:v,label:v})) },
      { name: "notes", label: "Notes", type: "textarea" },
    ]} />;
}
