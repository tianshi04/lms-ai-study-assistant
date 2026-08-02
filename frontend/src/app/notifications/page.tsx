import type { Metadata } from "next";
import { NotificationCenterClient } from "./NotificationCenterClient";

export const metadata: Metadata = {
  title: "Trung tâm Thông báo | Coursera LMS",
  description: "Quản lý và xem toàn bộ thông báo học tập, diễn đàn và chứng chỉ của bạn",
};

export default function NotificationsPage() {
  return <NotificationCenterClient />;
}
