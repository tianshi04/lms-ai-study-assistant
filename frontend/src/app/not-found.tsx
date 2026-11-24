import type { Metadata } from "next";
import { NotFoundClient } from "./NotFoundClient";

export const metadata: Metadata = {
  title: "404 - Không tìm thấy trang | LMS AI Platform",
  description: "The page you are looking for does not exist or has been moved.",
};

export default function NotFoundPage() {
  return <NotFoundClient />;
}
