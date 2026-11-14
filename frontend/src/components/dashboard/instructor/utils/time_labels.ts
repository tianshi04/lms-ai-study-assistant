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
        day: `${dayNum}`,
        date: dateStr,
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
        day: `${dayNum}`,
        date: dateStr,
        fullDateLabel: `${fullDayName}, ${dateStr}/${actualYear}`,
        showTick: isKeyTick,
        isFuture: false,
      });
    }
    return list;
  }

  // 6. Tùy chọn khoảng ngày cụ thể (Custom Range)
  if (range === "custom" && customStart && customEnd) {
    const [sy, sm, sd] = customStart.split("-").map(Number);
    const [ey, em, ed] = customEnd.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      const list: TimeDataPoint[] = [];
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const maxPoints = Math.min(diffDays, 90);
      const stride = maxPoints <= 14 ? 1 : maxPoints <= 31 ? 2 : maxPoints <= 60 ? 5 : 7;

      for (let i = 0; i < maxPoints; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const isToday =
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
        const dayName = isToday ? "Hôm nay" : dayNames[d.getDay()];
        const fullDayName = isToday ? "Hôm nay" : dayFullNames[d.getDay()];
        const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        const isKeyTick = i === 0 || i === maxPoints - 1 || i % stride === 0;
        const isFuture = isDateInFuture(d, now);
        list.push({
          day: dayName,
          date: dateStr,
          fullDateLabel: `${fullDayName}, ${dateStr}/${d.getFullYear()}`,
          showTick: isKeyTick,
          isFuture,
        });
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
