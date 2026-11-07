"use client";
import ResourceModule from "@/components/ResourceModule";
import { useI18n } from "@/lib/i18n";
export default function Page() {
  const { t } = useI18n();
  return <ResourceModule title={t("diseases")} endpoint="diseases" module="diseases"
    columns={[
      { key: "name", label: "Name" },
      { key: "name_uz", label: "Uz" },
      { key: "scientific_name", label: "Pathogen" },
      { key: "pathogen_type", label: "Type" },
    ]}
    filters={[{ name: "pathogen_type", label: "Type", options: ["fungal","bacterial","viral"].map(v=>({value:v,label:v})) }]}
    fields={[
      { name: "name", label: "Name", required: true },
      { name: "name_uz", label: "Name (Uz)" },
      { name: "name_ru", label: "Name (Ru)" },
      { name: "scientific_name", label: "Scientific name" },
      { name: "pathogen_type", label: "Pathogen type", type: "select", options: ["fungal","bacterial","viral"].map(v=>({value:v,label:v})) },
      { name: "symptoms", label: "Symptoms", type: "textarea" },
      { name: "control", label: "Control", type: "textarea" },
    ]} />;
}
