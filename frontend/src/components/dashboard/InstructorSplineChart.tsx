"use client";

import React, { useState, useRef, useId, memo } from "react";

export interface SplineDataPoint {
  day: string; // Tên ngắn hiển thị trục X (ví dụ: "T2", "01/11", "04h")
  date: string; // Ngày hoặc giờ (ví dụ: "03/11", "14:00")
  count: number; // Tổng lượng học viên tương tác
  completed: number; // Số lượt hoàn thành bài
  inProgress: number; // Số lượt đang học
  fullDateLabel?: string; // Tên đầy đủ cho tooltip (ví dụ: "Thứ Ba, 03/11/2026")
  showTick?: boolean; // Cờ hiển thị nhãn trên trục X (tránh đè chữ khi có 30 ngày)
  isFuture?: boolean; // Đánh dấu ngày trong tương lai (chưa diễn ra, count = 0)
}

interface InstructorSplineChartProps {
  data: SplineDataPoint[];
  height?: number;
  onSelectDay?: (item: SplineDataPoint) => void;
  selectedDay?: string | null;
  isLoading?: boolean;
}

function calculateNiceYTicks(maxVal: number): number[] {
  if (maxVal <= 10) return [0, 3, 6, 10];
  if (maxVal <= 20) return [0, 5, 10, 15, 20];
  if (maxVal <= 40) return [0, 10, 20, 30, 40];
  if (maxVal <= 60) return [0, 15, 30, 45, 60];
  if (maxVal <= 100) return [0, 25, 50, 75, 100];
  const step = Math.ceil(maxVal / 4 / 10) * 10;
  return [0, step, step * 2, step * 3, step * 4];
}

function generateSplinePath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 >= pts.length ? i + 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

function InstructorSplineChartComponent({
  data,
  height = 215,
  onSelectDay,
  selectedDay,
  isLoading = false,
}: InstructorSplineChartProps) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const padding = { top: 24, right: 24, bottom: 38, left: 38 };
  const width = 680;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const rawMax = Math.max(5, ...data.map((d) => Math.max(d.count, d.completed || 0)));
  const yTicks = calculateNiceYTicks(rawMax);
  const chartMax = Math.max(1, yTicks[yTicks.length - 1]);

  // Tọa độ chuỗi chính: count (học viên truy cập)
  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * innerWidth;
    const y = d.isFuture
      ? padding.top + innerHeight
      : padding.top + innerHeight - (d.count / chartMax) * innerHeight;
    const yCompleted = d.isFuture
      ? padding.top + innerHeight
      : padding.top + innerHeight - ((d.completed || 0) / chartMax) * innerHeight;
    return { x, y, yCompleted, data: d, index: i };
  });

  const activePoints = points.filter((p) => !p.data.isFuture);
  const activeCompletedPoints = points
    .filter((p) => !p.data.isFuture)
    .map((p) => ({ x: p.x, y: p.yCompleted }));

  const linePath = generateSplinePath(activePoints);
  const completedLinePath = generateSplinePath(activeCompletedPoints);

  const areaPath =
    activePoints.length > 0
      ? `${linePath} L ${activePoints[activePoints.length - 1].x} ${padding.top + innerHeight} L ${activePoints[0].x} ${padding.top + innerHeight} Z`
      : "";

  const handlePointerMove = (clientX: number) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const svgX = (relativeX / rect.width) * width;

    let closestIdx = 0;
    let minDistance = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }
    setHoveredIdx(closestIdx);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    handlePointerMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX);
    }
  };

  const handlePointerLeave = () => {
    setHoveredIdx(null);
  };

  const handleClick = () => {
    if (
      hoveredIdx !== null &&
      onSelectDay &&
      points[hoveredIdx] &&
      !points[hoveredIdx].data.isFuture
    ) {
      onSelectDay(points[hoveredIdx].data);
    }
  };

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  let tooltipTranslateX = "-50%";
  if (activePoint) {
    if (activePoint.x < 110) {
      tooltipTranslateX = "0%";
    } else if (activePoint.x > width - 110) {
      tooltipTranslateX = "-100%";
    }
  }

  const isDenseData = activePoints.length > 12;

  return (
    <div
      className={`relative w-full rounded-2xl bg-surface border border-outline-variant/60 p-3 select-none ${isLoading ? "opacity-60 pointer-events-none transition-opacity" : ""}`}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible cursor-crosshair touch-none focus:outline-none"
        style={{ minHeight: height }}
        role="region"
        aria-label="Biểu đồ xu hướng học tập đối sánh"
        tabIndex={0}
        suppressHydrationWarning
        onMouseMove={handleMouseMove}
        onMouseLeave={handlePointerLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePointerLeave}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            setHoveredIdx((prev) => (prev === null ? 0 : Math.min(points.length - 1, prev + 1)));
          } else if (e.key === "ArrowLeft") {
            setHoveredIdx((prev) => (prev === null ? points.length - 1 : Math.max(0, prev - 1)));
          } else if (e.key === "Enter" || e.key === " ") {
            if (
              hoveredIdx !== null &&
              onSelectDay &&
              points[hoveredIdx] &&
              !points[hoveredIdx].data.isFuture
            ) {
              onSelectDay(points[hoveredIdx].data);
            }
          }
        }}
      >
        <defs>
          {/* Subtle Ambient Area Gradient Fill */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="65%" stopColor="var(--color-primary)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
          </linearGradient>

          {/* Filter phát sáng nhẹ ambient glow */}
          <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Vùng bắt sự kiện chuột bao phủ toàn bộ biểu đồ */}
        <rect
          x={padding.left}
          y={padding.top}
          width={innerWidth}
          height={innerHeight + padding.bottom}
          fill="transparent"
        />

        {/* Lưới dóng ngang (Y-axis Gridlines) & Nhãn trục Y */}
        {yTicks.map((tickVal) => {
          const yPos = padding.top + innerHeight - (tickVal / chartMax) * innerHeight;
          return (
            <g key={tickVal}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={width - padding.right}
                y2={yPos}
                stroke="currentColor"
                className="text-outline-variant/40"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={yPos + 3.5}
                textAnchor="end"
                className="fill-muted-foreground text-[10px] font-mono select-none"
              >
                {tickVal}
              </text>
            </g>
          );
        })}

        {/* Vùng diện tích Gradient chuyển màu mờ ảo cho đường truy cập */}
        {areaPath && (
          <path d={areaPath} fill={`url(#${gradientId})`} className="transition-all duration-300" />
        )}

        {/* Đường cong 1 (Chính): Lượt học viên truy cập (Xanh dương) */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
        )}

        {/* Đường cong 2 (Đối sánh): Lượt hoàn thành bài học (Xanh lá - Success) */}
        {completedLinePath && (
          <path
            d={completedLinePath}
            fill="none"
            stroke="var(--color-success)"
            strokeWidth="2"
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
        )}

        {/* Crosshair Line dóng thẳng đứng bắt chuột */}
        {activePoint && (
          <g className="transition-opacity duration-150">
            <line
              x1={activePoint.x}
              y1={padding.top}
              x2={activePoint.x}
              y2={padding.top + innerHeight}
              stroke="var(--color-primary)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className={activePoint.data.isFuture ? "opacity-35" : "opacity-70"}
            />
          </g>
        )}

        {/* Các điểm dữ liệu & Nhãn trục X thích ứng */}
        {points.map((pt, i) => {
          const isSelected = selectedDay === pt.data.day || selectedDay === pt.data.date;
          const isHovered = hoveredIdx === i;
          const showLabel = pt.data.showTick !== false;
          const isFuture = pt.data.isFuture;

          return (
            <g key={`${pt.data.day}-${pt.data.date}-${i}`} suppressHydrationWarning>
              {/* Chấm tròn phát sáng khi Hover hoặc Selected - Đường truy cập */}
              {!isFuture && (isHovered || isSelected) && (
                <>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    fill="var(--color-primary)"
                    fillOpacity="0.25"
                    className="animate-ping"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.yCompleted}
                    r="7"
                    fill="var(--color-success)"
                    fillOpacity="0.25"
                  />
                </>
              )}

              {/* Nốt điểm dữ liệu trên đường truy cập (Xanh dương) */}
              {!isFuture && (!isDenseData || isHovered || isSelected) && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected || isHovered ? "5" : isDenseData ? "2" : "3.5"}
                  fill="var(--color-surface)"
                  stroke={
                    isSelected || isHovered
                      ? "var(--color-primary)"
                      : "var(--color-outline-variant)"
                  }
                  strokeWidth={isSelected || isHovered ? "2.5" : isDenseData ? "1.5" : "2"}
                  filter={isHovered ? `url(#glow-${gradientId})` : undefined}
                  className="transition-all duration-150"
                />
              )}

              {/* Nốt điểm dữ liệu trên đường hoàn thành (Xanh lá) */}
              {!isFuture && (!isDenseData || isHovered || isSelected) && (
                <circle
                  cx={pt.x}
                  cy={pt.yCompleted}
                  r={isSelected || isHovered ? "4" : isDenseData ? "1.5" : "2.5"}
                  fill="var(--color-surface)"
                  stroke="var(--color-success)"
                  strokeWidth="1.75"
                  className="transition-all duration-150"
                />
              )}

              {/* Chấm tròn mờ nhạt cho ngày trong tương lai */}
              {isFuture && (
                <circle
                  cx={pt.x}
                  cy={padding.top + innerHeight}
                  r={isHovered ? "4" : "2"}
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={isHovered ? undefined : "1 1"}
                  className={`transition-all duration-150 ${
                    isHovered ? "text-primary stroke-2" : "text-outline-variant/60"
                  }`}
                />
              )}

              {/* Nhãn trục X */}
              {showLabel && (
                <g>
                  <line
                    x1={pt.x}
                    y1={padding.top + innerHeight}
                    x2={pt.x}
                    y2={padding.top + innerHeight + 4}
                    stroke="currentColor"
                    className={isFuture ? "text-outline-variant/30" : "text-outline-variant/60"}
                    strokeWidth="1"
                  />
                  <text
                    suppressHydrationWarning
                    x={pt.x}
                    y={padding.top + innerHeight + 16}
                    textAnchor="middle"
                    className={`text-[10px] font-sans transition-colors ${
                      isFuture
                        ? "fill-muted-foreground/60 italic font-normal"
                        : isSelected || isHovered
                          ? "fill-primary font-bold"
                          : "fill-foreground font-medium"
                    }`}
                  >
                    {pt.data.day}
                  </text>
                  {pt.data.date && (
                    <text
                      suppressHydrationWarning
                      x={pt.x}
                      y={padding.top + innerHeight + 28}
                      textAnchor="middle"
                      className={`text-[9px] font-mono ${
                        isFuture ? "fill-muted-foreground/40" : "fill-muted-foreground"
                      }`}
                    >
                      {pt.data.date}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Glassmorphism Tooltip đối sánh kép */}
      {activePoint && (
        <div
          className="absolute z-30 pointer-events-none mb-3 px-3.5 py-2.5 rounded-xl bg-surface/95 backdrop-blur-md border border-outline-variant/80 shadow-xl transition-all duration-75 text-xs min-w-[200px]"
          style={{
            left: `${(activePoint.x / width) * 100}%`,
            top: `${(activePoint.y / height) * 100}%`,
            transform: `translate(${tooltipTranslateX}, -100%)`,
          }}
        >
          <div className="flex items-center justify-between gap-3 font-mono border-b border-outline-variant/40 pb-1 mb-1.5">
            <span className="font-bold text-foreground">
              {activePoint.data.fullDateLabel ||
                `${activePoint.data.day} (${activePoint.data.date})`}
            </span>
            {activePoint.data.isFuture ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground">
                Chưa diễn ra
              </span>
            ) : (
              <span className="text-primary font-bold">{activePoint.data.count} SV truy cập</span>
            )}
          </div>

          {activePoint.data.isFuture ? (
            <div className="text-[11px] text-muted-foreground italic py-1">
              Chưa tới ngày, chưa có dữ liệu học tập.
            </div>
          ) : (
            <div className="space-y-1.5 text-[11px] font-sans">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Lượt truy cập học tập:
                </span>
                <span className="font-mono font-bold text-foreground">
                  {activePoint.data.count} SV
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" /> Hoàn thành bài/quiz:
                </span>
                <span className="font-mono font-bold text-success">
                  {activePoint.data.completed} bài
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-outline-variant/30 text-[10px]">
                <span className="text-muted-foreground">Hiệu suất hoàn thành:</span>
                <span className="font-mono font-bold text-foreground">
                  {activePoint.data.count > 0
                    ? Math.round((activePoint.data.completed / activePoint.data.count) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          )}

          {!activePoint.data.isFuture && (
            <div className="mt-1.5 pt-1 border-t border-outline-variant/30 text-[9px] text-muted-foreground italic flex items-center justify-between">
              <span>Nhấp để lọc học viên</span>
              <span className="text-primary font-mono font-bold">↵</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const InstructorSplineChart = memo(InstructorSplineChartComponent);
