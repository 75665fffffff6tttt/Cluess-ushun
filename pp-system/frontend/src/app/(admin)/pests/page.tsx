"use client";
import ResourceModule from "@/components/ResourceModule";
import { useI18n } from "@/lib/i18n";
export default function Page() {
  const { t } = useI18n();
  return <ResourceModule title={t("pests")} endpoint="pests" module="pests"
    columns={[
      { key: "scientific_name", label: "Scientific name" },
      { key: "common_name", label: "Common name" },
      { key: "common_name_uz", label: "Uz" },
      { key: "economic_threshold", label: "Threshold" },
    ]}
    fields={[
      { name: "scientific_name", label: "Scientific name", required: true },
      { name: "common_name", label: "Common name" },
      { name: "common_name_uz", label: "Common name (Uz)" },
      { name: "common_name_ru", label: "Common name (Ru)" },
      { name: "order_family", label: "Order / family" },
      { name: "biology", label: "Biology", type: "textarea" },
      { name: "damage", label: "Damage", type: "textarea" },
      { name: "economic_threshold", label: "Economic threshold" },
      { name: "control_measures", label: "Control measures", type: "textarea" },
    ]} />;
}
