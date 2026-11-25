import type { SplineDataPoint } from "../../InstructorSplineChart";
import type { TimeDataPoint } from "../types";

export function isDateInFuture(d: Date, now: Date): boolean {
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return dStart > todayStart;
}

/**
 * Sinh danh sách nhãn thời gian động chuẩn xác theo lịch tự nhiên:
 * - Hôm nay (24h)
 * - Tuần này (Thứ 2 -> Chủ Nhật)
 * - 7 ngày gần nhất (Rolling 7 ngày)
 * - Tuần trước (Thứ 2 -> Chủ Nhật tuần trước)
 * - Tháng này (Tự động tính đúng 30 hoặc 31 ngày theo tháng hiện tại)
 * - Tháng trước (Tự động tính đúng số ngày tháng trước)
 * - Tùy chọn khoảng ngày cụ thể (Custom Range)
 */
export function generateTimeLabels(
  range: string,
  customStart?: string,
  customEnd?: string,
  baseDate?: Date,
): TimeDataPoint[] {
  const now = baseDate ?? new Date();
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dayFullNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  // 1. Hôm nay (24h - 9 mốc thời gian cách nhau 3 tiếng)
  if (range === "today") {
    const currentHour = now.getHours();
    const hours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
    return hours.map((h) => {
      const hStr = String(h === 24 ? 23 : h).padStart(2, "0");
      const mStr = h === 24 ? "59" : "00";
      const isFuture = h > currentHour;
      return {
        day: `${hStr}h`,
        date: `${hStr}:${mStr}`,
        fullDateLabel: `Hôm nay lúc ${hStr}:${mStr}`,
        showTick: true,
        isFuture,
      };
    });
  }

  // 2. Tuần này (Thứ Hai -> Chủ Nhật của tuần hiện tại)
  if (range === "this_week") {
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon);
    const list: TimeDataPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
      const dayName = isToday ? "Hôm nay" : dayNames[d.getDay()];
      const fullDayName = isToday ? "Hôm nay" : dayFullNames[d.getDay()];
      const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const isFuture = isDateInFuture(d, now);
      list.push({
        day: dayName,
        date: dateStr,
        fullDateLabel: `${fullDayName}, ${dateStr}/${d.getFullYear()}`,
        showTick: true,
        isFuture,
      });
    }
    return list;
  }

  // 3. Tuần trước (Trọn vẹn Thứ Hai -> Chủ Nhật tuần trước)
  if (range === "last_week") {
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon - 7);
    const list: TimeDataPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + i);
      const dayName = dayNames[d.getDay()];
      const fullDayName = dayFullNames[d.getDay()];
      const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      list.push({
        day: dayName,
        date: dateStr,
        fullDateLabel: `${fullDayName}, ${dateStr}/${d.getFullYear()}`,
        showTick: true,
        isFuture: false,
      });
    }
    return list;
  }

  // 4. Tháng này (Từ ngày 1 đến ngày cuối cùng của tháng hiện tại)
  if (range === "this_month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const list: TimeDataPoint[] = [];
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const d = new Date(year, month, dayNum);
      const fullDayName = dayFullNames[d.getDay()];
      const dateStr = `${String(dayNum).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}`;
      const isKeyTick =
        dayNum === 1 ||
        dayNum === 5 ||
        dayNum === 10 ||
        dayNum === 15 ||
        dayNum === 20 ||
        dayNum === 25 ||
        dayNum === totalDays;
      const isFuture = isDateInFuture(d, now);
      list.push({
        day: dateStr,
        date: "",
        fullDateLabel: `${fullDayName}, ${dateStr}/${year}`,
        showTick: isKeyTick,
        isFuture,
      });
    }
    return list;
  }

  // 5. Tháng trước (Trọn vẹn tất cả ngày của tháng trước)
  if (range === "last_month") {
    const year = now.getFullYear();
    const month = now.getMonth() - 1;
    const refDate = new Date(year, month, 1);
    const actualYear = refDate.getFullYear();
    const actualMonth = refDate.getMonth();
    const totalDays = new Date(actualYear, actualMonth + 1, 0).getDate();
    const list: TimeDataPoint[] = [];
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const d = new Date(actualYear, actualMonth, dayNum);
      const fullDayName = dayFullNames[d.getDay()];
      const dateStr = `${String(dayNum).padStart(2, "0")}/${String(actualMonth + 1).padStart(2, "0")}`;
      const isKeyTick =
        dayNum === 1 ||
        dayNum === 5 ||
        dayNum === 10 ||
        dayNum === 15 ||
        dayNum === 20 ||
        dayNum === 25 ||
        dayNum === totalDays;
      list.push({
        day: dateStr,
        date: "",
        fullDateLabel: `${fullDayName}, ${dateStr}/${actualYear}`,
        showTick: isKeyTick,
        isFuture: false,
      });
    }
    return list;
  }

  // 6. Tùy chọn khoảng ngày cụ thể (Custom Range: Ngày <= 31d, Tuần 32-180d, Tháng 181-1095d, Năm > 1095d)
  if (range === "custom" && customStart && customEnd) {
    const [sy, sm, sd] = customStart.split("-").map(Number);
    const [ey, em, ed] = customEnd.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      const list: TimeDataPoint[] = [];
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays <= 31) {
        // 1. Hàng ngày (Daily step <= 31 ngày)
        const stride = diffDays <= 14 ? 1 : diffDays <= 21 ? 2 : 4;
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
          const isToday =
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();
          const dayName = isToday ? "Hôm nay" : dayNames[d.getDay()];
          const fullDayName = isToday ? "Hôm nay" : dayFullNames[d.getDay()];
          const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          const isKeyTick = i === 0 || i === diffDays - 1 || i % stride === 0;
          const isFuture = isDateInFuture(d, now);
          const dayLabel = diffDays > 14 ? dateStr : dayName;
          const subDateLabel = diffDays > 14 ? "" : dateStr;
          list.push({
            day: dayLabel,
            date: subDateLabel,
            fullDateLabel: `${fullDayName}, ${dateStr}/${d.getFullYear()}`,
            showTick: isKeyTick,
            isFuture,
          });
        }
      } else if (diffDays <= 180) {
        // 2. Hàng tuần (Weekly step 32 - 180 ngày)
        const totalWeeks = Math.ceil(diffDays / 7);
        const stride = totalWeeks <= 12 ? 1 : 2;
        for (let i = 0; i < totalWeeks; i++) {
          const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7);
          const fullDayName = dayFullNames[d.getDay()];
          const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          const isKeyTick = i === 0 || i === totalWeeks - 1 || i % stride === 0;
          const isFuture = isDateInFuture(d, now);
          list.push({
            day: dateStr,
            date: "",
            fullDateLabel: `Tuần từ ${fullDayName}, ${dateStr}/${d.getFullYear()}`,
            showTick: isKeyTick,
            isFuture,
          });
        }
      } else if (diffDays <= 1095) {
        // 3. Hàng tháng (Monthly step 181 - 1095 ngày / 6 tháng đến 3 năm)
        let curYear = start.getFullYear();
        let curMonth = start.getMonth();
        const endYear = end.getFullYear();
        const endMonth = end.getMonth();

        const monthItems: { year: number; month: number }[] = [];
        while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
          monthItems.push({ year: curYear, month: curMonth });
          curMonth++;
          if (curMonth > 11) {
            curMonth = 0;
            curYear++;
          }
        }

        const stride = monthItems.length <= 12 ? 1 : Math.ceil(monthItems.length / 8);
        monthItems.forEach((item, idx) => {
          const mNum = item.month + 1;
          const yShort = String(item.year).slice(2);
          const lbl = `T${mNum}/${yShort}`;
          const isKeyTick = idx === 0 || idx === monthItems.length - 1 || idx % stride === 0;
          const isFuture =
            item.year > now.getFullYear() ||
            (item.year === now.getFullYear() && item.month > now.getMonth());
          list.push({
            day: lbl,
            date: "",
            fullDateLabel: `Tháng ${mNum}/${item.year}`,
            showTick: isKeyTick,
            isFuture,
          });
        });
      } else {
        // 4. Hàng năm (Yearly step > 3 năm)
        const startY = start.getFullYear();
        const endY = end.getFullYear();
        for (let y = startY; y <= endY; y++) {
          const isFuture = y > now.getFullYear();
          list.push({
            day: `${y}`,
            date: "",
            fullDateLabel: `Năm ${y}`,
            showTick: true,
            isFuture,
          });
        }
      }

      return list;
    }
  }

  // 7. Mặc định: 7 ngày gần nhất (Rolling 7 days)
  const labels: TimeDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const isToday = i === 0;
    const dayName = isToday ? "Hôm nay" : dayNames[d.getDay()];
    const fullDayName = isToday ? "Hôm nay" : dayFullNames[d.getDay()];
    const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    labels.push({
      day: dayName,
      date: dateStr,
      fullDateLabel: `${fullDayName}, ${dateStr}/${d.getFullYear()}`,
      showTick: true,
      isFuture: false,
    });
  }
  return labels;
}

export interface TimelinePointLike {
  timestamp: string;
  label: string;
  activeLearners: number;
  completedItems: number;
  inProgress: number;
}

/**
 * Chuyển đổi timeline thực tế từ Backend API thành mảng điểm dữ liệu cho biểu đồ Spline Chart.
 * Đồng bộ 100% nhãn ngày/tháng/năm và các chỉ số hoạt động mà không bị lệch index hay cụt ngày.
 */
export function formatTimelineToSplineData(
  timeline: TimelinePointLike[] | undefined,
  chartDateRange: string,
  customStart?: string,
  customEnd?: string,
): SplineDataPoint[] {
  if (timeline && timeline.length > 0) {
    const total = timeline.length;
    const stride = total > 14 ? Math.ceil(total / 8) : 1;

    return timeline.map((p, idx) => {
      const day = p.label;
      let date = "";
      let fullDateLabel = p.label;

      if (p.timestamp.includes("-")) {
        const parts = p.timestamp.split("-");
        if (parts.length === 3) {
          const [y, m, d] = parts;
          const dateStr = `${d}/${m}`;
          if (chartDateRange === "today") {
            date = p.label;
            fullDateLabel = `Hôm nay lúc ${p.label}`;
          } else if (p.label.startsWith("T") || p.label === "CN" || p.label === "Hôm nay") {
            date = dateStr;
            fullDateLabel = `${p.label}, ${dateStr}/${y}`;
          } else {
            fullDateLabel = `${dateStr}/${y}`;
          }
        } else if (parts.length === 2) {
          const [y, m] = parts;
          fullDateLabel = `Tháng ${parseInt(m, 10)}/${y}`;
        }
      }

      const showTick = idx === 0 || idx === total - 1 || idx % stride === 0;

      return {
        day,
        date,
        timestamp: p.timestamp,
        fullDateLabel,
        showTick,
        isFuture: false,
        count: p.activeLearners,
        completed: p.completedItems,
        inProgress: p.inProgress,
      };
    });
  }

  // Fallback placeholder khi chưa có dữ liệu từ backend
  const fallbackLabels = generateTimeLabels(chartDateRange, customStart, customEnd);
  return fallbackLabels.map((l) => ({
    day: l.day,
    date: l.date,
    fullDateLabel: l.fullDateLabel,
    showTick: l.showTick,
    isFuture: l.isFuture,
    count: 0,
    completed: 0,
    inProgress: 0,
  }));
}
