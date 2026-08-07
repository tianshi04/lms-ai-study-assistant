"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  GraduationCap,
  Award,
  Search,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Sparkles,
  Users,
  X,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { usePartnersQuery, useCoursesQuery } from "@/lib/query_hooks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

const ITEMS_PER_PAGE = 6;

export function PartnersCatalogClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const { data: partners = [], isLoading: partnersLoading } = usePartnersQuery();
  const { data: courses = [], isLoading: coursesLoading } = useCoursesQuery();

  // Map total courses per partner
  const partnerCourseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const partner of partners) {
      const pNameLower = partner.name.toLowerCase();
      const pLogo = partner.logoUrl;
      const count = courses.filter(
        (c) =>
          c.partnerName.toLowerCase() === pNameLower ||
          (c.partnerLogoUrl && pLogo && c.partnerLogoUrl === pLogo),
      ).length;
      counts[partner.id] = count;
    }
    return counts;
  }, [partners, courses]);

  // Filter partners based on search query
  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const query = searchQuery.toLowerCase();
    return partners.filter(
      (partner) =>
        partner.name.toLowerCase().includes(query) ||
        partner.description.toLowerCase().includes(query),
    );
  }, [partners, searchQuery]);

  const totalPartnerCourses = useMemo(() => {
    return Object.values(partnerCourseCounts).reduce((acc, curr) => acc + curr, 0);
  }, [partnerCourseCounts]);

  const totalPages = Math.ceil(filteredPartners.length / ITEMS_PER_PAGE);

  const paginatedPartners = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPartners.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPartners, currentPage]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  return (
    <div className="w-full bg-background text-foreground pb-20">
      {/* Dynamic Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary-rgb,37,99,235),0.08),transparent_50%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Mạng lưới Đối tác Chiến lược & Cấp chứng chỉ</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight leading-tight text-balance">
              Hợp tác cùng các <span className="text-primary">Tổ chức Hàng đầu</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Chúng tôi hợp tác với các trường đại học hàng đầu và các tập đoàn công nghệ tiên phong
              để xây dựng chương trình đào tạo chuẩn quốc tế và phát hành chứng chỉ số hóa
              OpenBadges được công nhận toàn cầu.
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
              <div className="bg-card border border-border p-4 rounded-2xl shadow-xs">
                <div className="flex items-center space-x-2 text-primary mb-1">
                  <Building2 className="w-5 h-5" aria-hidden="true" />
                  <span className="text-2xl font-black">{partners.length || "4+"}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Đối tác Giáo dục</p>
              </div>

              <div className="bg-card border border-border p-4 rounded-2xl shadow-xs">
                <div className="flex items-center space-x-2 text-primary mb-1">
                  <BookOpen className="w-5 h-5" aria-hidden="true" />
                  <span className="text-2xl font-black">{totalPartnerCourses || "12+"}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Khóa học phát hành</p>
              </div>

              <div className="bg-card border border-border p-4 rounded-2xl sm:col-span-1 col-span-2 shadow-xs">
                <div className="flex items-center space-x-2 text-primary mb-1">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                  <span className="text-2xl font-black">OpenBadges</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Xác thực Mật mã Ký số</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-12">
        {/* Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 sm:p-6 rounded-3xl shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              name="search"
              autoComplete="off"
              aria-label="Tìm kiếm đối tác"
              placeholder="Tìm kiếm đối tác theo tên hoặc thông tin…"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-9 bg-background border-border text-foreground rounded-xl text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-0.5"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Partner Count Badge */}
          <div className="text-xs text-muted-foreground font-medium shrink-0">
            <span>
              Hiển thị{" "}
              <strong className="text-foreground font-bold">{filteredPartners.length}</strong> đối
              tác
            </span>
          </div>
        </div>

        {/* Partners Grid */}
        {partnersLoading || coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-3xl p-6 space-y-4 animate-pulse"
              >
                <div className="h-32 bg-muted rounded-2xl w-full" />
                <div className="h-6 bg-muted rounded-md w-3/4" />
                <div className="h-4 bg-muted rounded-md w-full" />
                <div className="h-4 bg-muted rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-3xl p-8 max-w-md mx-auto">
            <Building2
              aria-hidden="true"
              className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60"
            />
            <h3 className="text-lg font-bold text-foreground mb-1">Không tìm thấy đối tác nào</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Không có đối tác phù hợp với từ khóa &quot;{searchQuery}&quot;. Vui lòng thử tìm kiếm
              lại.
            </p>
            <Button
              onClick={() => {
                handleSearchChange("");
              }}
              variant="outline"
              className="text-xs cursor-pointer"
            >
              Đặt lại tìm kiếm
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedPartners.map((partner) => {
                const courseCount = partnerCourseCounts[partner.id] || 0;
                return (
                  <Link
                    key={partner.id}
                    href={`/partners/${partner.slug || partner.id}`}
                    className="bg-card border border-border rounded-3xl overflow-hidden hover:shadow-xl hover:border-primary/40 transition-colors duration-300 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Partner Banner Header */}
                      <div className="relative h-36 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-muted overflow-hidden">
                        {partner.bannerUrl ? (
                          <Image
                            src={partner.bannerUrl}
                            alt={partner.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--primary-rgb,37,99,235),0.15),transparent)]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                      </div>

                      {/* Logo & Info Body */}
                      <div className="px-6 pt-0 pb-4 relative">
                        {/* Logo Box */}
                        <div className="w-20 h-20 -mt-12 rounded-2xl bg-card border-2 border-border shadow-md p-2 flex items-center justify-center overflow-hidden mb-4 shrink-0 group-hover:scale-105 transition-transform duration-300">
                          {partner.logoUrl ? (
                            <Image
                              src={partner.logoUrl}
                              alt={partner.name}
                              width={64}
                              height={64}
                              className="object-contain max-h-full"
                              unoptimized
                            />
                          ) : (
                            <span className="font-extrabold text-2xl text-primary">
                              {partner.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors tracking-tight min-w-0 line-clamp-1">
                            {partner.name}
                          </h2>
                          <ArrowRight
                            className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-colors shrink-0"
                            aria-hidden="true"
                          />
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed min-w-0 line-clamp-3">
                          {partner.description ||
                            "Tổ chức đối tác chiến lược tham gia cấp phát khóa học và chứng chỉ chuẩn hóa."}
                        </p>
                      </div>
                    </div>

                    {/* Footer Action Area */}
                    <div className="px-6 pb-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <BookOpen className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        {courseCount} Khóa học phát hành
                      </span>

                      {partner.websiteUrl && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            window.open(partner.websiteUrl, "_blank", "noopener,noreferrer");
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-muted/80"
                          title="Trang web chính thức"
                        >
                          <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
                          <span>Website</span>
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Hiển thị{" "}
                  <strong className="text-foreground font-semibold">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredPartners.length)}
                  </strong>{" "}
                  trên tổng số{" "}
                  <strong className="text-foreground font-semibold">
                    {filteredPartners.length}
                  </strong>{" "}
                  đối tác
                </p>

                <div className="flex items-center space-x-1.5">
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    className="p-2 rounded-xl text-xs cursor-pointer disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft aria-hidden="true" className="w-4 h-4" />
                  </Button>

                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === page
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <Button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    className="p-2 rounded-xl text-xs cursor-pointer disabled:opacity-40"
                    aria-label="Trang tiếp"
                  >
                    <ChevronRight aria-hidden="true" className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OpenBadges Certification Value Section */}
        <section className="bg-card border border-border rounded-3xl p-8 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="max-w-3xl space-y-4 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Award className="w-4 h-4" aria-hidden="true" />
              <span>Chứng chỉ Ký số Tiêu chuẩn Quốc tế</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Giá trị Chứng chỉ do Đối tác Cấp phát
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mỗi chứng chỉ hoàn thành khóa học từ các đối tác trên LMS AI đều tuân thủ định dạng mã
              hóa OpenBadges 3.0, hỗ trợ kiểm tra mã ký công khai (Public Key PEM) và dễ dàng tích
              hợp vào hồ sơ LinkedIn, CV cá nhân.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 relative">
            <div className="bg-background border border-border p-5 rounded-2xl space-y-2">
              <ShieldCheck className="w-6 h-6 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-bold text-foreground">Xác minh Mã hóa Public Key</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mã chữ ký số duy nhất được tạo ra bởi khóa công khai của trường đối tác, đảm bảo
                chống làm giả 100%.
              </p>
            </div>

            <div className="bg-background border border-border p-5 rounded-2xl space-y-2">
              <GraduationCap className="w-6 h-6 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-bold text-foreground">Chuẩn OpenBadges 3.0</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tiêu chuẩn chứng chỉ số toàn cầu được công nhận bởi hàng ngàn nhà tuyển dụng và tổ
                chức giáo dục.
              </p>
            </div>

            <div className="bg-background border border-border p-5 rounded-2xl space-y-2">
              <Users className="w-6 h-6 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-bold text-foreground">Chia sẻ Hồ sơ Chuyên nghiệp</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dễ dàng đính kèm vào hồ sơ LinkedIn, mạng xã hội hoặc gửi liên kết xác thực công
                khai cho nhà tuyển dụng.
              </p>
            </div>
          </div>
        </section>

        {/* Become a Partner Call-To-Action (CTA) */}
        <section className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-3xl p-8 sm:p-12 shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Bạn là Trường Đại học hoặc Tổ chức Doanh nghiệp?
            </h2>
            <p className="text-sm text-primary-foreground/90 leading-relaxed">
              Hãy trở thành đối tác phát hành khóa học trên LMS AI Study Assistant để tiếp cận hàng
              nghìn học viên và cấp chứng chỉ số hóa OpenBadges được chứng nhận.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              onClick={() => setIsContactModalOpen(true)}
              className="bg-card text-foreground hover:bg-card/90 font-bold px-6 py-3 rounded-2xl shadow-md cursor-pointer text-sm border border-border"
            >
              Liên hệ Đăng ký Đối tác
            </Button>
          </div>
        </section>
      </div>

      {/* Contact Partner Inquiry Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Đăng ký Hợp tác Phát hành Khóa học"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Để đăng ký làm đối tác đào tạo hoặc tổ chức cấp chứng chỉ trên nền tảng, vui lòng gửi
            thông tin đơn vị của bạn tới bộ phận Hợp tác chiến lược:
          </p>

          <div className="bg-muted p-4 rounded-2xl border border-border space-y-2">
            <div className="flex items-center space-x-2 text-primary font-semibold text-xs">
              <Mail aria-hidden="true" className="w-4 h-4" />
              <span>Email liên hệ đối tác:</span>
            </div>
            <p className="font-mono text-xs text-foreground font-bold selection:bg-primary">
              partners@lms-ai-study.edu.vn
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-2xl border border-border space-y-1.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Thông tin cần chuẩn bị:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Tên tổ chức / Trường Đại học / Doanh nghiệp</li>
              <li>Lĩnh vực đào tạo & danh sách chương trình dự kiến</li>
              <li>Thông tin người đại diện và vị trí công tác</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={() => setIsContactModalOpen(false)}
              className="bg-primary text-primary-foreground text-xs font-semibold rounded-xl"
            >
              Đã hiểu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
