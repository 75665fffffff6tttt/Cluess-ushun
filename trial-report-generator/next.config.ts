import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker учун мустақил (standalone) чиқиш
  output: "standalone",
  // Нативли / серверда ишлайдиган пакетлар bundling'дан ташқарида қолдирилади
  serverExternalPackages: ["sharp", "docx", "docxtemplater", "pizzip", "exceljs"],
};

export default nextConfig;
