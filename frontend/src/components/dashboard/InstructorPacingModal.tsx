"use client";

import React, { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Table } from "@/components/ui/Table";
import {
  Search,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Mail,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { InstructorBulkReminderModal } from "./InstructorBulkReminderModal";

export type PacingCategory = "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND";

export interface StudentPacingRecord {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  courseId: string;
  courseTitle: string;
  progressPercent: number;
  currentLesson: string;
  currentWeekNumber: number;
  lastActive: string;
  daysInactive: number;
  pace: "AHEAD" | "ON_TRACK" | "BEHIND";
  paceDescription: string;
  bottleneckStuck?: boolean;
}

// 25 mẫu học viên chân thực trên cả 3 khóa học của PGS. TS. Trần Minh Tuấn
const MOCK_PACING_STUDENTS: StudentPacingRecord[] = [
  // --- VƯỢT TIẾN ĐỘ (AHEAD) ---
  {
    id: "st-01",
    name: "Hoàng Văn Nam",
    email: "nam.hoang@student.neu.edu.vn",
    courseId: "course-microeconomics-foundations",
    courseTitle: "Kinh tế học Vi mô Căn bản",
    progressPercent: 100,
    currentLesson: "Đã hoàn thành toàn bộ khóa học",
    currentWeekNumber: 2,
    lastActive: "Hôm qua lúc 14:30",
    daysInactive: 1,
    pace: "AHEAD",
    paceDescription: "Hoàn thành trước hạn 6 ngày, chuẩn bị cấp chứng chỉ",
  },
  {
    id: "st-02",
    name: "Lê Thu Thảo",
    email: "thao.le@fpt.edu.vn",
    courseId: "course-applied-econometrics",
    courseTitle: "Kinh tế lượng Ứng dụng",
    progressPercent: 100,
    currentLesson: "Đã hoàn thành toàn bộ khóa học",
    currentWeekNumber: 2,
    lastActive: "2 ngày trước",
    daysInactive: 2,
    pace: "AHEAD",
    paceDescription: "Nộp bài kiểm định giả thuyết F đạt 100% điểm",
  },
  {
    id: "st-03",
    name: "Nguyễn Quốc Anh",
    email: "quocanh.ng@hcmut.edu.vn",
    courseId: "course-behavioral-pricing-strategy",
    courseTitle: "Kinh tế học Hành vi & Định giá",
    progressPercent: 88,
    currentLesson: "Bài 4: Tối ưu hóa Doanh thu Đa kênh",
    currentWeekNumber: 2,
    lastActive: "3 giờ trước",
    daysInactive: 0,
    pace: "AHEAD",
    paceDescription: "Học vượt 2 bài trước lịch trình đề xuất",
  },
  {
    id: "st-04",
    name: "Trần Bảo Ngọc",
    email: "ngoc.tran@neu.edu.vn",
    courseId: "course-microeconomics-foundations",
    courseTitle: "Kinh tế học Vi mô Căn bản",
    progressPercent: 92,
    currentLesson: "Bài 5: Thặng dư Xã hội & Cân bằng Thị trường",
    currentWeekNumber: 2,
    lastActive: "Hôm nay lúc 09:15",
    daysInactive: 0,
    pace: "AHEAD",
    paceDescription: "Tốc độ học gấp 1.8 lần tốc độ trung bình lớp",
  },
  {
    id: "st-05",
    name: "Vũ Minh Quân",
    email: "quan.vm@rmit.edu.vn",
    courseId: "course-behavioral-pricing-strategy",
    courseTitle: "Kinh tế học Hành vi & Định giá",
    progressPercent: 85,
    currentLesson: "Bài 3: Hiệu ứng Chim mồi & Mỏ neo",
    currentWeekNumber: 2,
    lastActive: "Hôm qua lúc 21:00",
    daysInactive: 1,
    pace: "AHEAD",
    paceDescription: "Điểm quiz trung bình đạt 9.5/10",
  },
  {
    id: "st-06",
    name: "Phạm Hải Đăng",
    email: "dang.ph@hust.edu.vn",
    courseId: "course-applied-econometrics",
    courseTitle: "Kinh tế lượng Ứng dụng",
    progressPercent: 82,
    currentLesson: "Bài 3: Khắc phục Hiện tượng Phương sai Sai số Thay đổi",
    currentWeekNumber: 2,
    lastActive: "4 giờ trước",
    daysInactive: 0,
    pace: "AHEAD",
    paceDescription: "Chủ động làm trước bài tập thực hành Stata/R",
  },

  // --- ĐÚNG TIẾN ĐỘ (ON_TRACK) ---
  {
    id: "st-07",
    name: "Nguyễn Văn An",
    email: "an.nguyen@ftu.edu.vn",
    courseId: "course-microeconomics-foundations",
    courseTitle: "Kinh tế học Vi mô Căn bản",
    progressPercent: 65,
    currentLesson: "Bài 3: Hệ số Co giãn Cung - Cầu theo Giá",
    currentWeekNumber: 1,
    lastActive: "Hôm nay lúc 11:20",
    daysInactive: 0,
    pace: "ON_TRACK",
    paceDescription: "Học đều đặn 45 phút/ngày, bám sát lịch học tuần 1",
  },
  {
    id: "st-08",
    name: "Trần Thị Mai",
    email: "mai.tran@ueh.edu.vn",
    courseId: "course-behavioral-pricing-strategy",
    courseTitle: "Kinh tế học Hành vi & Định giá",
    progressPercent: 55,
    currentLesson: "Bài 2: Tâm lý Học Cài cắm Giá (Psychological Pricing)",
    currentWeekNumber: 1,
    lastActive: "Hôm qua lúc 18:40",
    daysInactive: 1,
    pace: "ON_TRACK",
    paceDescription: "Vừa hoàn thành bài tập trắc nghiệm chương 1",
  },
  {
    id: "st-09",
    name: "Lê Quốc Huy",
    email: "huy.le@tdtu.edu.vn",
    courseId: "course-applied-econometrics",
    courseTitle: "Kinh tế lượng Ứng dụng",
    progressPercent: 50,
    currentLesson: "Bài 2: Hồi quy Đa biến & Đa cộng tuyến",
    currentWeekNumber: 1,
    lastActive: "2 ngày trước",
    daysInactive: 2,
    pace: "ON_TRACK",
    paceDescription: "Tham gia thảo luận diễn đàn tích cực",
  },
  {
    id: "st-10",
    name: "Đỗ Bích Thủy",
    email: "thuy.do@neu.edu.vn",
    courseId: "course-microeconomics-foundations",
    courseTitle: "Kinh tế học Vi mô Căn bản",
    progressPercent: 58,
    currentLesson: "Bài 2: Cung Cầu & Tác động Thuế quan",
    currentWeekNumber: 1,
    lastActive: "Hôm qua lúc 20:10",
    daysInactive: 1,
    pace: "ON_TRACK",
    paceDescription: "Nộp bài đúng hạn, tiến độ hoàn thành ổn định",
  },
  {
    id: "st-11",
    name: "Bùi Tuấn Kiệt",
    email: "kiet.bt@vnu.edu.vn",
    courseId: "course-behavioral-pricing-strategy",
    courseTitle: "Kinh tế học Hành vi & Định giá",
    progressPercent: 48,
    currentLesson: "Bài 2: Chiến lược Định giá Phiến diện",
    currentWeekNumber: 1,
    lastActive: "Hôm nay lúc 08:30",
    daysInactive: 0,
    pace: "ON_TRACK",
    paceDescription: "Xem video bài giảng đạt 95% thời lượng",
  },
  {
    id: "st-12",
    name: "Phan Ánh Nguyệt",
    email: "nguyet.pa@buv.edu.vn",
    courseId: "course-applied-econometrics",
    courseTitle: "Kinh tế lượng Ứng dụng",
    progressPercent: 60,
    currentLesson: "Bài 2: Mô hình Hồi quy Tuyến tính Đơn",
    currentWeekNumber: 1,
    lastActive: "3 ngày trước",
    daysInactive: 3,
    pace: "ON_TRACK",
    paceDescription: "Đã làm xong bài thực hành số liệu doanh nghiệp",
  },
  {
    id: "st-13",
    name: "Hà Minh Trí",
    email: "tri.hm@uel.edu.vn",
    courseId: "course-microeconomics-foundations",
    courseTitle: "Kinh tế học Vi mô Căn bản",
    progressPercent: 70,
    currentLesson: "Bài 4: Thị trường Cạnh tranh Hoàn hảo",
    currentWeekNumber: 2,
    lastActive: "Hôm nay lúc 10:00",
    daysInactive: 0,
    pace: "ON_TRACK",
    paceDescription: "Bắt đầu học nội dung Tuần 2 theo đúng tiến độ kế hoạch",
  },
  {
    id: "st-14",
    name: "Ngô Thanh Hằng",
    email: "hang.ngo@dav.edu.vn",
    courseId: "course-behavioral-pricing-strategy",
    courseTitle: "Kinh tế học Hành vi & Định giá",
    progressPercent: 52,
    currentLesson: "Bài 2: Ma trận Định giá Giá trị Khách hàng",
    currentWeekNumber: 1,
    lastActive: "Hôm qua lúc 15:20",
    daysInactive: 1,
    pace: "ON_TRACK",
    paceDescription: "Nhịp học ổn định, chưa có bài tập nộp trễ",
  },

  // --- CHẬM TIẾN ĐỘ / CẦN CAN THIỆP (BEHIND) ---
  {
    id: "st-15",
    name: "Đặng Khánh Linh",
    email: "linh.dk@student.neu.edu.vn",
    courseId: "course-behavioral-pricing-strategy",
    courseTitle: "Kinh tế học Hành vi & Định giá",
    progressPercent: 12,
    currentLesson: "Bài 1: Giới thiệu Tâm lý Học Hành vi",
    currentWeekNumber: 1,
    lastActive: "8 ngày trước",
    daysInactive: 8,
    pace: "BEHIND",
    paceDescription: "Dừng học tại Tuần 1, không đăng nhập 8 ngày liên tiếp",
    bottleneckStuck: true,
  },
  {
    id: "st-16",
    name: "Võ Thành Long",
    email: "long.vt@hust.edu.vn",
    courseId: "course-applied-econometrics",
    courseTitle: "Kinh tế lượng Ứng dụng",
    progressPercent: 18,
    currentLesson: "Bài 1: Ôn tập Xác suất Thống kê cho Kinh tế lượng",
    currentWeekNumber: 1,
    lastActive: "11 ngày trước",
    daysInactive: 11,
    pace: "BEHIND",
    paceDescription: "Chưa nộp bài tập Tuần 1, có nguy cơ bỏ dở khóa học",
    bottleneckStuck: true,
  },
  {
    id: "st-17",
    name: "Phạm Thu Hà",
    email: "ha.pham@ftu.edu.vn",
    courseId: "course-microeconomics-foundations",
    courseTitle: "Kinh tế học Vi mô Căn bản",
    progressPercent: 20,
    currentLesson: "Bài 1: Giới thiệu Cơ chế Thị trường",
    currentWeekNumber: 1,
    lastActive: "6 ngày trước",
    daysInactive: 6,
    pace: "BEHIND",
    paceDescription: "Tiến độ đạt 20%, đang xin hỗ trợ tài chính",
  },
  {
    id: "st-18",
    name: "Dương Minh Đức",
    email: "duc.dm@hcmussh.edu.vn",
    courseId: "course-behavioral-pricing-strategy",
    courseTitle: "Kinh tế học Hành vi & Định giá",
    progressPercent: 15,
    currentLesson: "Bài 1: Định giá Theo Chi phí vs Theo Giá trị",
    currentWeekNumber: 1,
    lastActive: "9 ngày trước",
    daysInactive: 9,
    pace: "BEHIND",
    paceDescription: "Bị kẹt tại điểm nghẽn Tuần 1, chưa xem xong video 2",
    bottleneckStuck: true,
  },
  {
    id: "st-19",
    name: "Lâm Gia Hân",
    email: "han.lg@vanlanguni.edu.vn",
    courseId: "course-applied-econometrics",
    courseTitle: "Kinh tế lượng Ứng dụng",
    progressPercent: 22,
    currentLesson: "Bài 1: Cài đặt và Làm quen Giao diện Stata/R",
    currentWeekNumber: 1,
    lastActive: "7 ngày trước",
    daysInactive: 7,
    pace: "BEHIND",
    paceDescription: "Gặp khó khăn kỹ thuật khi cài đặt phần mềm phân tích",
    bottleneckStuck: true,
  },
  {
    id: "st-20",
    name: "Trịnh Hoàng Yến",
    email: "yen.th@hub.edu.vn",
    courseId: "course-microeconomics-foundations",
    courseTitle: "Kinh tế học Vi mô Căn bản",
    progressPercent: 25,
    currentLesson: "Bài 1: Đường Giới hạn Khả năng Sản xuất (PPF)",
    currentWeekNumber: 1,
    lastActive: "5 ngày trước",
    daysInactive: 5,
    pace: "BEHIND",
    paceDescription: "Tỷ lệ làm quiz lần đầu chỉ đạt 4/10 điểm, cần ôn tập",
  },
];

interface InstructorPacingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: PacingCategory;
  initialCourseId?: string;
  coursesList?: { id: string; title: string }[];
}

export function InstructorPacingModal({
  open,
  onOpenChange,
  initialCategory = "ALL",
  initialCourseId = "ALL",
  coursesList = [
    {
      id: "course-microeconomics-foundations",
      title: "Kinh tế học Vi mô Căn bản: Nguyên lý Thị trường & Quyết định Giá cả",
    },
    {
      id: "course-behavioral-pricing-strategy",
      title: "Kinh tế học Hành vi & Chiến lược Định giá Doanh nghiệp",
    },
    {
      id: "course-applied-econometrics",
      title: "Kinh tế lượng Ứng dụng & Phân tích Dữ liệu Kinh doanh",
    },
  ],
}: InstructorPacingModalProps) {
  const toast = useToast();
  const [selectedPace, setSelectedPace] = useState<PacingCategory>(initialCategory);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourseId);
  const [searchQuery, setSearchQuery] = useState("");
  const [nudgedStudentIds, setNudgedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState(false);

  // Sync state when dialog opens or initialCategory/initialCourseId changes
  const [prevOpenState, setPrevOpenState] = useState({ open, initialCategory, initialCourseId });
  if (
    prevOpenState.open !== open ||
    prevOpenState.initialCategory !== initialCategory ||
    prevOpenState.initialCourseId !== initialCourseId
  ) {
    setPrevOpenState({ open, initialCategory, initialCourseId });
    if (open) {
      setSelectedPace(initialCategory);
      setSelectedCourse(initialCourseId);
    }
  }

  // Bộ đếm phân loại trên toàn hệ thống
  const counts = useMemo(() => {
    return {
      all: MOCK_PACING_STUDENTS.length,
      ahead: MOCK_PACING_STUDENTS.filter((s) => s.pace === "AHEAD").length,
      onTrack: MOCK_PACING_STUDENTS.filter((s) => s.pace === "ON_TRACK").length,
      behind: MOCK_PACING_STUDENTS.filter((s) => s.pace === "BEHIND").length,
    };
  }, []);

  // Lọc danh sách học viên
  const filteredStudents = useMemo(() => {
    return MOCK_PACING_STUDENTS.filter((st) => {
      // 1. Lọc theo pace
      if (selectedPace === "AHEAD" && st.pace !== "AHEAD") return false;
      if (selectedPace === "ON_TRACK" && st.pace !== "ON_TRACK") return false;
      if (selectedPace === "BEHIND" && st.pace !== "BEHIND") return false;

      // 2. Lọc theo khóa học
      if (selectedCourse !== "ALL" && st.courseId !== selectedCourse) return false;

      // 3. Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchEmail = st.email.toLowerCase().includes(q);
        const matchLesson = st.currentLesson.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchLesson) return false;
      }

      return true;
    });
  }, [selectedPace, selectedCourse, searchQuery]);

  // Nhắc nhở 1 học viên
  const handleNudgeStudent = async (student: StudentPacingRecord) => {
    setNudgedStudentIds((prev) => new Set(prev).add(student.id));
    try {
      if (student.courseId) {
        const client = getRpcClient(CatalogService);
        await client.sendStudentReminder({
          courseId: student.courseId,
          studentIds: [student.id],
          title: `[Nhắc nhở học tập] Tiến độ môn ${student.courseTitle}`,
          content: `Chào ${student.name}, Thầy/Cô nhận thấy em đang dừng ở ${student.currentLesson}. Hãy sắp xếp thời gian hoàn thành bài học và bài kiểm tra tuần này để bám sát lộ trình nhé!`,
        });
      }
      toast.success(`Đã gửi thông báo & email khích lệ học tập tới học viên ${student.name}!`, {
        description: `Lộ trình hiện tại: ${student.currentLesson}`,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể gửi nhắc nhở học viên.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Dialog.Content size="2xl" className="p-6 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header Dialog */}
          <Dialog.Header className="pb-3 border-b border-outline-variant/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <Dialog.Title className="text-base font-bold text-foreground">
                    Bảng Kiểm Soát Nhịp Độ & Tiến Độ Học Tập
                  </Dialog.Title>
                </div>
                <Dialog.Description className="text-xs text-muted-foreground mt-1">
                  Theo dõi 200 học viên, phát hiện sớm người học chậm để can thiệp sư phạm kịp thời
                </Dialog.Description>
              </div>
            </div>
          </Dialog.Header>

          {/* Thẻ Tab Phân Loại Nhịp Độ (Cohort Pacing Tabs) */}
          <div className="pt-3 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Tất cả */}
            <button
              type="button"
              onClick={() => setSelectedPace("ALL")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "ALL"
                  ? "bg-surface border-primary ring-2 ring-primary/20 shadow-xs"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-primary/50"
              }`}
            >
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Tất cả học viên
              </div>
              <div className="text-lg font-black text-foreground font-mono mt-0.5">
                {counts.all} SV
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Toàn bộ 3 khóa học</div>
            </button>

            {/* Vượt tiến độ */}
            <button
              type="button"
              onClick={() => setSelectedPace("AHEAD")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "AHEAD"
                  ? "bg-success/10 border-success ring-2 ring-success/20 shadow-xs"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-success/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Vượt tiến độ
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-success/20 text-success font-bold">
                  {Math.round((counts.ahead / counts.all) * 100)}%
                </span>
              </div>
              <div className="text-lg font-black text-success font-mono mt-0.5">
                {counts.ahead} SV
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Học nhanh hơn hạn</div>
            </button>

            {/* Đúng tiến độ */}
            <button
              type="button"
              onClick={() => setSelectedPace("ON_TRACK")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "ON_TRACK"
                  ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Đúng tiến độ
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                  {Math.round((counts.onTrack / counts.all) * 100)}%
                </span>
              </div>
              <div className="text-lg font-black text-primary font-mono mt-0.5">
                {counts.onTrack} SV
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Bám sát lịch tuần</div>
            </button>

            {/* Chậm tiến độ */}
            <button
              type="button"
              onClick={() => setSelectedPace("BEHIND")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "BEHIND"
                  ? "bg-destructive/10 border-destructive ring-2 ring-destructive/20 shadow-xs"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-destructive/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Chậm tiến độ
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-destructive/20 text-destructive font-bold">
                  {Math.round((counts.behind / counts.all) * 100)}%
                </span>
              </div>
              <div className="text-lg font-black text-destructive font-mono mt-0.5">
                {counts.behind} SV
              </div>
              <div className="text-[10px] text-destructive/80 font-bold mt-0.5">
                Cần can thiệp gấp
              </div>
            </button>
          </div>

          {/* Thanh công cụ Tìm kiếm & Lọc môn học & Nút Nhắc nhở hàng loạt */}
          <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Tìm tên học viên, email, bài học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="relative min-w-[180px] max-w-[240px]">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-hidden cursor-pointer truncate"
                >
                  <option value="ALL">Tất cả môn học ({coursesList.length})</option>
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nút Nhắc nhở hàng loạt (chỉ sáng khi có học sinh chậm tiến độ) */}
            {selectedPace === "BEHIND" || counts.behind > 0 ? (
              <button
                type="button"
                disabled={filteredStudents.filter((s) => s.pace === "BEHIND").length === 0}
                onClick={() => setIsBulkReminderModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-auto"
                title="Mở hộp thoại xem trước và tùy chỉnh thông báo nhắc nhở"
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {`Nhắc nhở toàn bộ (${filteredStudents.filter((s) => s.pace === "BEHIND").length} SV chậm)`}
                </span>
              </button>
            ) : null}
          </div>

          {/* Bảng Danh Sách Học Viên Chi Tiết */}
          <div className="flex-1 overflow-y-auto rounded-2xl border border-outline-variant/60 bg-surface min-h-[300px]">
            <Table>
              <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
                <Table.Row className="text-[11px] text-muted-foreground border-b border-outline-variant/60">
                  <Table.Head>Học viên & Môn học</Table.Head>
                  <Table.Head>Tiến độ & Bài học</Table.Head>
                  <Table.Head>Phân loại nhịp độ</Table.Head>
                  <Table.Head>Hoạt động gần nhất</Table.Head>
                  <Table.Head className="text-right">Kiểm soát sư phạm</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredStudents.length === 0 ? (
                  <Table.Row>
                    <Table.Cell
                      colSpan={5}
                      className="text-center py-12 text-xs text-muted-foreground"
                    >
                      Không tìm thấy học viên nào phù hợp với bộ lọc hiện tại.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredStudents.map((st) => {
                    const isNudged = nudgedStudentIds.has(st.id);

                    return (
                      <Table.Row key={st.id} className="text-xs hover:bg-muted/30">
                        {/* Cột 1: Thông tin học viên */}
                        <Table.Cell>
                          <div className="font-bold text-foreground">{st.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {st.email}
                          </div>
                          <div className="text-[10px] text-primary font-medium flex items-center gap-1 mt-0.5 truncate max-w-[220px]">
                            <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{st.courseTitle}</span>
                          </div>
                        </Table.Cell>

                        {/* Cột 2: Tiến độ & Bài học hiện tại */}
                        <Table.Cell>
                          <div className="space-y-1 max-w-[170px]">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-foreground">
                                {st.progressPercent}%
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Tuần {st.currentWeekNumber}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted">
                              <div
                                style={{ width: `${st.progressPercent}%` }}
                                className={`h-full rounded-full ${
                                  st.pace === "AHEAD"
                                    ? "bg-success"
                                    : st.pace === "ON_TRACK"
                                      ? "bg-primary"
                                      : "bg-destructive"
                                }`}
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                              {st.currentLesson}
                            </div>
                          </div>
                        </Table.Cell>

                        {/* Cột 3: Phân loại nhịp độ */}
                        <Table.Cell>
                          {st.pace === "AHEAD" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
                              <CheckCircle2 className="w-3 h-3" /> Vượt tiến độ
                            </span>
                          ) : st.pace === "ON_TRACK" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                              <Clock className="w-3 h-3" /> Đúng tiến độ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                              <AlertTriangle className="w-3 h-3" /> Chậm tiến độ
                            </span>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug max-w-[190px]">
                            {st.paceDescription}
                          </div>
                        </Table.Cell>

                        {/* Cột 4: Hoạt động gần nhất */}
                        <Table.Cell>
                          <span
                            className={`text-[11px] font-mono block ${
                              st.daysInactive >= 7
                                ? "text-destructive font-bold"
                                : st.daysInactive >= 3
                                  ? "text-warning font-semibold"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {st.lastActive}
                          </span>
                          {st.daysInactive >= 7 && (
                            <span className="text-[9px] text-destructive block font-bold">
                              Không học &gt; {st.daysInactive} ngày
                            </span>
                          )}
                        </Table.Cell>

                        {/* Cột 5: Hành động sư phạm */}
                        <Table.Cell className="text-right">
                          <button
                            type="button"
                            disabled={isNudged}
                            onClick={() => handleNudgeStudent(st)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                              isNudged
                                ? "bg-muted text-muted-foreground opacity-60 cursor-default"
                                : st.pace === "BEHIND"
                                  ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/30"
                                  : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30"
                            }`}
                            title="Gửi email và thông báo nhắc nhở học tập"
                          >
                            {isNudged ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-success" />
                                <span>Đã gửi nhắc</span>
                              </>
                            ) : (
                              <>
                                <Mail className="w-3 h-3" />
                                <span>Nhắc nhở</span>
                              </>
                            )}
                          </button>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table>
          </div>

          {/* Footer Modal: Tổng kết & Hướng dẫn */}
          <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Đang hiển thị <strong>{filteredStudents.length}</strong> học viên
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-1.5 rounded-xl bg-surface hover:bg-muted text-foreground border border-outline-variant font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog>

      {/* Modal Tùy chỉnh & Xác nhận nhắc nhở hàng loạt theo điểm nghẽn */}
      {isBulkReminderModalOpen && (
        <InstructorBulkReminderModal
          key={`pacing-bulk-${isBulkReminderModalOpen}`}
          open={isBulkReminderModalOpen}
          onOpenChange={setIsBulkReminderModalOpen}
          courseId={selectedCourse}
          courseTitle={
            selectedCourse !== "ALL"
              ? coursesList.find((c) => c.id === selectedCourse)?.title || "Khóa học"
              : "Tất cả khóa học"
          }
          students={filteredStudents
            .filter((s) => s.pace === "BEHIND")
            .map((s) => ({
              userId: s.id,
              userName: s.name,
              userEmail: s.email,
              progressPercent: s.progressPercent,
              paceDesc: s.paceDescription,
              courseId: s.courseId,
              courseTitle: s.courseTitle,
            }))}
          bottleneckWeek={
            filteredStudents.some((s) => s.bottleneckStuck)
              ? { weekNumber: 2, title: "Hành vi Người tiêu dùng & Độ co giãn", dropRate: 75 }
              : null
          }
          onSuccess={(studentIds) => {
            setNudgedStudentIds((prev) => {
              const next = new Set(prev);
              studentIds.forEach((id) => next.add(id));
              return next;
            });
          }}
        />
      )}
    </>
  );
}
