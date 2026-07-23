"use client";
import ResourceModule from "@/components/ResourceModule";
import { useI18n } from "@/lib/i18n";
const ROLES = ["super_admin","admin","laboratory","inspector","researcher","farmer"];
export default function Page() {
  const { t } = useI18n();
  return <ResourceModule title={t("users")} endpoint="users" module="users"
    columns={[
      { key: "username", label: "Username" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "roles", label: "Role", render: (r) => Array.isArray(r.roles) ? (r.roles as {name:string}[]).map(x=>x.name).join(", ") : "—" },
      { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "✗" },
    ]}
    fields={[
      { name: "username", label: "Username", required: true },
      { name: "name", label: "Name", required: true },
      { name: "email", label: "Email" },
      { name: "phone", label: "Phone" },
      { name: "organization", label: "Organization" },
      { name: "password", label: "Password (min 8)" },
      { name: "role", label: "Role", type: "select", required: true, options: ROLES.map(v=>({value:v,label:v})) },
    ]} />;
}
