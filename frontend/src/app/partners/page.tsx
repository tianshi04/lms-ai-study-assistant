import type { Metadata } from "next";
import { PartnersCatalogClient } from "./PartnersCatalogClient";

export const metadata: Metadata = {
  title: "Đối tác Giáo dục & Đào tạo | LMS AI Study Assistant",
  description:
    "Khám phá danh sách các trường đại học, viện nghiên cứu và tập đoàn đối tác chiến lược cấp chứng chỉ số hóa chuẩn OpenBadges trên LMS AI Study Assistant.",
};

export default function PartnersPage() {
  return <PartnersCatalogClient />;
}
