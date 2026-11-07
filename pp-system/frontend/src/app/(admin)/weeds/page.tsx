"use client";
import ResourceModule from "@/components/ResourceModule";
import { useI18n } from "@/lib/i18n";
export default function Page() {
  const { t } = useI18n();
  return <ResourceModule title={t("weeds")} endpoint="weeds" module="weeds"
    columns={[
      { key: "name", label: "Name" },
      { key: "scientific_name", label: "Scientific name" },
      { key: "weed_type", label: "Type" },
    ]}
    fields={[
      { name: "name", label: "Name", required: true },
      { name: "scientific_name", label: "Scientific name" },
      { name: "weed_type", label: "Type" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "herbicide_recommendation", label: "Herbicide recommendation", type: "textarea" },
    ]} />;
}
