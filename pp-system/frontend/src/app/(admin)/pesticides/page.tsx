"use client";
import ResourceModule from "@/components/ResourceModule";
import { useI18n } from "@/lib/i18n";
export default function Page() {
  const { t } = useI18n();
  return <ResourceModule title={t("pesticides")} endpoint="pesticides" module="pesticides"
    columns={[
      { key: "trade_name", label: "Trade name" },
      { key: "active_ingredient", label: "Active ingredient" },
      { key: "company", label: "Company" },
      { key: "pesticide_type", label: "Type" },
      { key: "crop", label: "Crop" },
      { key: "application_rate", label: "Rate" },
    ]}
    filters={[{ name: "pesticide_type", label: "Type", options: ["insecticide","fungicide","herbicide","acaricide"].map(v=>({value:v,label:v})) }]}
    fields={[
      { name: "trade_name", label: "Trade name", required: true },
      { name: "active_ingredient", label: "Active ingredient", required: true },
      { name: "company", label: "Company" },
      { name: "registration_number", label: "Registration number" },
      { name: "registration_date", label: "Registration date", type: "date" },
      { name: "expiry_date", label: "Expiry date", type: "date" },
      { name: "pesticide_type", label: "Type", type: "select", options: ["insecticide","fungicide","herbicide","acaricide","nematicide","rodenticide"].map(v=>({value:v,label:v})) },
      { name: "formulation", label: "Formulation" },
      { name: "application_rate", label: "Application rate" },
      { name: "crop", label: "Crop" },
      { name: "target_pest", label: "Target pest" },
      { name: "instructions", label: "Instructions", type: "textarea" },
    ]} />;
}
