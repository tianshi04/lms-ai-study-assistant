"use client";

import { useId, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { AlertCircle, RefreshCw, TrendingUp, X } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { useAdminCatalogTrendQuery } from "@/lib/queries/useCatalogQueries";
import { useAdminCertificateTrendQuery } from "@/lib/queries/useCertificateQueries";
import { useAdminLearningTrendQuery } from "@/lib/queries/useLearningQueries";
import { useAdminPaymentTrendQuery } from "@/lib/queries/usePaymentQueries";
import { formatNumber, formatVnd } from "./formatters";

export type AdminTrendMetric = "learning" | "csat" | "revenue" | "certificates";

const DAY_RANGES = [7, 30, 90] as const;
type DayRange = (typeof DAY_RANGES)[number];

const SVG_WIDTH = 720;
const SVG_HEIGHT = 232;
const PADDING = { top: 20, right: 18, bottom: 32, left: 60 } as const;
const PLOT_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

interface ChartPoint {
  date: string;
  primaryValue: number;
  secondaryValue?: number;
  tooltipLines: string[];
}

interface SummaryStat {
  label: string;
  value: string;
}

interface NormalizedTrendSeries {
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryColorClass: string;
  secondaryLabel?: string;
  secondaryColorClass?: string;
  points: ChartPoint[];
  summaryStats: SummaryStat[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  formatYTick: (value: number) => string;
}

/** Formats an ISO `YYYY-MM-DD` UTC day without local-timezone date shifting. */
function formatIsoDay(isoDate: string, includeYear = false): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

function formatCompactVnd(value: number): string {
  if (value === 0) return "0 đ";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} k`;
  return formatNumber(Math.round(value));
}

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatNumber(Math.round(value));
}

function computeYAxisMax(points: ChartPoint[]): number {
  let max = 0;
  for (const p of points) {
    if (p.primaryValue > max) max = p.primaryValue;
    if (p.secondaryValue !== undefined && p.secondaryValue > max) max = p.secondaryValue;
  }
  if (max <= 0) return 3;
  // Round up cleanly so 3 grid intervals map to readable integers / currency amounts.
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const scaled = max / magnitude;
  const niceFactor =
    scaled <= 1.2 ? 1.2 : scaled <= 1.5 ? 1.5 : scaled <= 3 ? 3 : scaled <= 6 ? 6 : 9;
  return Math.max(3, Math.ceil(niceFactor * magnitude));
}

function findPeakSummary(points: ChartPoint[], formatValue: (value: number) => string): string {
  let best: ChartPoint | null = null;
  for (const point of points) {
    if (point.primaryValue > 0 && (!best || point.primaryValue > best.primaryValue)) {
      best = point;
    }
  }
  return best ? `${formatIsoDay(best.date, true)} (${formatValue(best.primaryValue)})` : "Chưa có";
}

function useTrendSeries(metric: AdminTrendMetric, days: DayRange): NormalizedTrendSeries {
  const learningQuery = useAdminLearningTrendQuery(days, { enabled: metric === "learning" });
  const csatQuery = useAdminCatalogTrendQuery(days, { enabled: metric === "csat" });
  const revenueQuery = useAdminPaymentTrendQuery(days, { enabled: metric === "revenue" });
  const certQuery = useAdminCertificateTrendQuery(days, { enabled: metric === "certificates" });

  return useMemo(() => {
    if (metric === "learning") {
      const raw = learningQuery.data?.points ?? [];
      let totalEnrollments = 0;
      let totalCompletions = 0;
      const points: ChartPoint[] = raw.map((p) => {
        totalEnrollments += p.enrollments;
        totalCompletions += p.completions;
        return {
          date: p.date,
          primaryValue: p.enrollments,
          secondaryValue: p.completions,
          tooltipLines: [
            `Ghi danh mới: ${formatNumber(p.enrollments)}`,
            `Hoàn thành: ${formatNumber(p.completions)}`,
          ],
        };
      });
      return {
        title: "Xu hướng Ghi danh & Hoàn thành",
        subtitle: `Diễn biến theo ngày trong ${days} ngày gần nhất (UTC)`,
        primaryLabel: "Ghi danh mới",
        primaryColorClass: "text-success",
        secondaryLabel: "Hoàn thành",
        secondaryColorClass: "text-primary",
        points,
        summaryStats: [
          { label: `Ghi danh (${days}N)`, value: formatNumber(totalEnrollments) },
          { label: `Hoàn thành (${days}N)`, value: formatNumber(totalCompletions) },
          {
            label: "Cao điểm ghi danh",
            value: findPeakSummary(points, formatCompactCount),
          },
        ],
        isLoading: learningQuery.isLoading,
        isError: learningQuery.isError,
        refetch: () => {
          void learningQuery.refetch();
        },
        formatYTick: formatCompactCount,
      };
    }

    if (metric === "csat") {
      const raw = csatQuery.data?.points ?? [];
      let totalReviews = 0;
      let weightedSum = 0;
      const points: ChartPoint[] = raw.map((p) => {
        totalReviews += p.reviewCount;
        weightedSum += p.averageRating * p.reviewCount;
        return {
          date: p.date,
          primaryValue: p.reviewCount,
          tooltipLines: [
            `Lượt đánh giá: ${formatNumber(p.reviewCount)}`,
            p.reviewCount > 0
              ? `Điểm TB trong ngày: ${p.averageRating.toFixed(2)} / 5`
              : "Chưa có đánh giá",
          ],
        };
      });
      const avgWindowRating =
        totalReviews > 0 ? `${(weightedSum / totalReviews).toFixed(2)} / 5` : "—";
      return {
        title: "Xu hướng Mức hài lòng (CSAT)",
        subtitle: `Lượt đánh giá khóa học phát sinh trong ${days} ngày gần nhất (UTC)`,
        primaryLabel: "Lượt đánh giá / ngày",
        primaryColorClass: "text-warning",
        points,
        summaryStats: [
          { label: `Đánh giá (${days}N)`, value: formatNumber(totalReviews) },
          { label: "Điểm TB trong kỳ", value: avgWindowRating },
          {
            label: "Cao điểm đánh giá",
            value: findPeakSummary(points, formatCompactCount),
          },
        ],
        isLoading: csatQuery.isLoading,
        isError: csatQuery.isError,
        refetch: () => {
          void csatQuery.refetch();
        },
        formatYTick: formatCompactCount,
      };
    }

    if (metric === "revenue") {
      const raw = revenueQuery.data?.points ?? [];
      let totalRevenue = 0;
      let totalPurchases = 0;
      const points: ChartPoint[] = raw.map((p) => {
        totalRevenue += p.revenue;
        totalPurchases += p.purchaseCount;
        return {
          date: p.date,
          primaryValue: p.revenue,
          tooltipLines: [
            `Doanh thu: ${formatVnd(p.revenue)}`,
            `Mua khóa học lẻ: ${formatNumber(p.purchaseCount)} lượt`,
          ],
        };
      });
      return {
        title: "Xu hướng Doanh thu",
        subtitle: `Doanh thu mua khóa học & Coursera Plus hoàn tất trong ${days} ngày gần nhất (UTC)`,
        primaryLabel: "Doanh thu (VNĐ)",
        primaryColorClass: "text-success",
        points,
        summaryStats: [
          { label: `Doanh thu (${days}N)`, value: formatVnd(totalRevenue) },
          { label: "Mua khóa học lẻ", value: `${formatNumber(totalPurchases)} lượt` },
          { label: "Ngày cao nhất", value: findPeakSummary(points, formatCompactVnd) },
        ],
        isLoading: revenueQuery.isLoading,
        isError: revenueQuery.isError,
        refetch: () => {
          void revenueQuery.refetch();
        },
        formatYTick: formatCompactVnd,
      };
    }

    const raw = certQuery.data?.points ?? [];
    let totalIssued = 0;
    const points: ChartPoint[] = raw.map((p) => {
      totalIssued += p.issued;
      return {
        date: p.date,
        primaryValue: p.issued,
        tooltipLines: [`Chứng chỉ đã cấp: ${formatNumber(p.issued)}`],
      };
    });
    const avgPerDay = raw.length > 0 ? (totalIssued / raw.length).toFixed(1) : "0";
    return {
      title: "Xu hướng Chứng chỉ đã cấp",
      subtitle: `Số chứng chỉ phát hành mới mỗi ngày trong ${days} ngày gần nhất (UTC)`,
      primaryLabel: "Chứng chỉ đã cấp",
      primaryColorClass: "text-info",
      points,
      summaryStats: [
        { label: `Tổng cấp (${days}N)`, value: formatNumber(totalIssued) },
        { label: "Trung bình / ngày", value: avgPerDay },
        {
          label: "Ngày cấp nhiều nhất",
          value: findPeakSummary(points, formatCompactCount),
        },
      ],
      isLoading: certQuery.isLoading,
      isError: certQuery.isError,
      refetch: () => {
        void certQuery.refetch();
      },
      formatYTick: formatCompactCount,
    };
  }, [metric, days, learningQuery, csatQuery, revenueQuery, certQuery]);
}

function xForIndex(index: number, total: number): number {
  if (total <= 1) return PADDING.left + PLOT_WIDTH / 2;
  return PADDING.left + (index / (total - 1)) * PLOT_WIDTH;
}

function yForValue(value: number, yMax: number): number {
  const ratio = Math.min(1, Math.max(0, value / yMax));
  return PADDING.top + PLOT_HEIGHT - ratio * PLOT_HEIGHT;
}

function pickTickIndices(total: number): number[] {
  if (total <= 0) return [];
  if (total <= 7) return Array.from({ length: total }, (_, idx) => idx);
  const steps = 5;
  const indices = new Set<number>([0]);
  for (let i = 1; i < steps; i += 1) {
    indices.add(Math.round((i / steps) * (total - 1)));
  }
  indices.add(total - 1);
  return Array.from(indices).sort((a, b) => a - b);
}

export interface AdminTrendPanelProps {
  metric: AdminTrendMetric;
  onClose: () => void;
}

export function AdminTrendPanel({ metric, onClose }: AdminTrendPanelProps) {
  const [days, setDays] = useState<DayRange>(30);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gradientId = useId().replace(/:/g, "");
  const series = useTrendSeries(metric, days);

  const yMax = useMemo(() => computeYAxisMax(series.points), [series.points]);
  const hasAnyData = useMemo(
    () => series.points.some((p) => p.primaryValue > 0 || (p.secondaryValue ?? 0) > 0),
    [series.points],
  );

  const primaryPolyline = useMemo(
    () =>
      series.points
        .map(
          (p, idx) => `${xForIndex(idx, series.points.length)},${yForValue(p.primaryValue, yMax)}`,
        )
        .join(" "),
    [series.points, yMax],
  );

  const primaryAreaPath = useMemo(() => {
    if (series.points.length === 0) return "";
    const bottomY = PADDING.top + PLOT_HEIGHT;
    const coords = series.points.map(
      (p, idx) => `${xForIndex(idx, series.points.length)},${yForValue(p.primaryValue, yMax)}`,
    );
    const firstX = xForIndex(0, series.points.length);
    const lastX = xForIndex(series.points.length - 1, series.points.length);
    return `M ${firstX},${bottomY} L ${coords.join(" L ")} L ${lastX},${bottomY} Z`;
  }, [series.points, yMax]);

  const secondaryPolyline = useMemo(() => {
    if (!series.secondaryLabel) return "";
    return series.points
      .map(
        (p, idx) =>
          `${xForIndex(idx, series.points.length)},${yForValue(p.secondaryValue ?? 0, yMax)}`,
      )
      .join(" ");
  }, [series.points, series.secondaryLabel, yMax]);

  const updateHoveredFromClientX = (clientX: number) => {
    const svgEl = svgRef.current;
    if (!svgEl || series.points.length === 0) return;
    const rect = svgEl.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * SVG_WIDTH;
    const clampedRatio = Math.min(1, Math.max(0, (svgX - PADDING.left) / PLOT_WIDTH));
    const idx =
      series.points.length === 1 ? 0 : Math.round(clampedRatio * (series.points.length - 1));
    setHoveredIndex(idx);
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    updateHoveredFromClientX(event.clientX);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (touch) updateHoveredFromClientX(touch.clientX);
  };

  const activePoint =
    hoveredIndex !== null && hoveredIndex < series.points.length
      ? series.points[hoveredIndex]
      : null;
  const activeX =
    hoveredIndex !== null && series.points.length > 0
      ? xForIndex(hoveredIndex, series.points.length)
      : null;
  const xTicks = useMemo(() => pickTickIndices(series.points.length), [series.points.length]);

  return (
    <Surface
      id="admin-trend-panel"
      variant="low"
      shape="2xl"
      aria-live="polite"
      className="p-5 space-y-4 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp aria-hidden="true" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-foreground">{series.title}</h3>
            <p className="text-xs text-muted-foreground">{series.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <fieldset
            aria-label="Khoảng thời gian biểu đồ"
            className="inline-flex rounded-xl bg-background/80 p-1 border border-border/60 m-0"
          >
            {DAY_RANGES.map((range) => {
              const selected = days === range;
              return (
                <button
                  key={range}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setDays(range);
                    setHoveredIndex(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range} ngày
                </button>
              );
            })}
          </fieldset>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu đồ xu hướng"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Period Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {series.summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-background/70 border border-border/50 px-3.5 py-2.5 flex items-baseline justify-between gap-2"
          >
            <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
            {series.isLoading ? (
              <span className="h-4 w-16 rounded bg-muted/60 animate-pulse" />
            ) : (
              <span className="text-sm font-extrabold font-mono text-foreground truncate">
                {stat.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Interactive Chart Body */}
      {series.isLoading ? (
        <div
          aria-label="Đang tải dữ liệu biểu đồ"
          className="h-56 rounded-xl bg-muted/40 animate-pulse"
        />
      ) : series.isError ? (
        <div className="h-44 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-2 text-center px-4">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm font-semibold text-foreground">
            Không thể tải dữ liệu biểu đồ theo thời gian.
          </p>
          <button
            type="button"
            onClick={series.refetch}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Thử lại
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onMouseLeave={() => setHoveredIndex(null)}
            onTouchEnd={() => setHoveredIndex(null)}
            className="relative rounded-xl bg-background/60 border border-border/50 p-3"
          >
            {!hasAnyData && (
              <div className="absolute top-3 right-4 z-10 rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                Chưa phát sinh hoạt động trong {days} ngày gần đây
              </div>
            )}

            {activePoint && activeX !== null && (
              <div
                style={{
                  left: `${Math.min(82, Math.max(18, (activeX / SVG_WIDTH) * 100))}%`,
                }}
                className="pointer-events-none absolute top-3 z-20 -translate-x-1/2 rounded-xl bg-popover/95 text-popover-foreground border border-border shadow-md px-3 py-2 text-xs whitespace-nowrap"
              >
                <p className="font-bold text-foreground mb-0.5">
                  {formatIsoDay(activePoint.date, true)}
                </p>
                {activePoint.tooltipLines.map((line) => (
                  <p key={line} className="font-mono text-[11px] text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              aria-label={`${series.title} (${days} ngày)`}
              className="w-full h-56 select-none overflow-visible"
            >
              <title>{`${series.title} (${days} ngày)`}</title>
              <defs>
                <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal gridlines and Y-axis ticks */}
              {[0, 0.333, 0.666, 1].map((fraction) => {
                const y = PADDING.top + PLOT_HEIGHT - fraction * PLOT_HEIGHT;
                const tickVal = Math.round(fraction * yMax);
                return (
                  <g key={fraction}>
                    <line
                      x1={PADDING.left}
                      x2={PADDING.left + PLOT_WIDTH}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray={fraction === 0 ? undefined : "4 4"}
                      className="text-border/70"
                      strokeWidth={1}
                    />
                    <text
                      x={PADDING.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-muted-foreground text-[10px] font-mono"
                    >
                      {series.formatYTick(tickVal)}
                    </text>
                  </g>
                );
              })}

              {/* X-axis date labels */}
              {xTicks.map((idx) => {
                const pt = series.points[idx];
                if (!pt) return null;
                return (
                  <text
                    key={pt.date}
                    x={xForIndex(idx, series.points.length)}
                    y={SVG_HEIGHT - 8}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px] font-mono"
                  >
                    {formatIsoDay(pt.date)}
                  </text>
                );
              })}

              {/* Primary series area + stroke */}
              {primaryAreaPath && (
                <path
                  d={primaryAreaPath}
                  fill={`url(#area-${gradientId})`}
                  className={series.primaryColorClass}
                />
              )}
              {primaryPolyline && (
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={primaryPolyline}
                  className={series.primaryColorClass}
                />
              )}

              {/* Secondary series stroke (used for completions) */}
              {secondaryPolyline && (
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray="5 3"
                  points={secondaryPolyline}
                  className={series.secondaryColorClass ?? "text-primary"}
                />
              )}

              {/* Single-point marker fallback when 1 day is shown or all 7 points are sparse */}
              {series.points.length <= 14 &&
                series.points.map((pt, idx) => (
                  <circle
                    key={pt.date}
                    cx={xForIndex(idx, series.points.length)}
                    cy={yForValue(pt.primaryValue, yMax)}
                    r={hoveredIndex === idx ? 5 : 3}
                    fill="currentColor"
                    className={series.primaryColorClass}
                  />
                ))}

              {/* Active hover crosshair and highlighted dots */}
              {activePoint && activeX !== null && (
                <g>
                  <line
                    x1={activeX}
                    x2={activeX}
                    y1={PADDING.top}
                    y2={PADDING.top + PLOT_HEIGHT}
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    className="text-muted-foreground/70"
                  />
                  <circle
                    cx={activeX}
                    cy={yForValue(activePoint.primaryValue, yMax)}
                    r={5.5}
                    fill="currentColor"
                    stroke="var(--background)"
                    strokeWidth={2}
                    className={series.primaryColorClass}
                  />
                  {activePoint.secondaryValue !== undefined && (
                    <circle
                      cx={activeX}
                      cy={yForValue(activePoint.secondaryValue, yMax)}
                      r={5}
                      fill="currentColor"
                      stroke="var(--background)"
                      strokeWidth={2}
                      className={series.secondaryColorClass ?? "text-primary"}
                    />
                  )}
                </g>
              )}
            </svg>
          </div>

          {/* Series legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <span className={`w-3 h-1 rounded-full bg-current ${series.primaryColorClass}`} />
                {series.primaryLabel}
              </span>
              {series.secondaryLabel && (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <span
                    className={`w-3 h-0 border-t-2 border-dashed border-current ${series.secondaryColorClass ?? "text-primary"}`}
                  />
                  {series.secondaryLabel}
                </span>
              )}
            </div>
            <span>Di chuột lên biểu đồ để xem chi tiết từng ngày</span>
          </div>
        </div>
      )}
    </Surface>
  );
}
