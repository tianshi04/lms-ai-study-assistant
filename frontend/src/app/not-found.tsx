import type { Metadata } from "next";
import { NotFoundClient } from "./NotFoundClient";

export const metadata: Metadata = {
  title: "404 - Page Not Found | Coursera LMS Platform",
  description: "The page you are looking for does not exist or has been moved.",
};

export default function NotFoundPage() {
  return <NotFoundClient />;
}
