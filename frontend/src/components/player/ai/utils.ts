"use client";

export function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getItemTypeName(type: number | undefined): string {
  switch (type) {
    case 1:
      return "Video bài giảng";
    case 2:
      return "Bài đọc (Reading)";
    case 3:
      return "Bài tập thực hành (Practice Quiz)";
    case 4:
      return "Bài kiểm tra tính điểm (Graded Quiz)";
    case 5:
      return "Bài thực hành Lab";
    case 6:
      return "Đánh giá ngang hàng (Peer Review)";
    default:
      return "Bài học";
  }
}

export { getMessageText } from "@/components/ai/utils";
