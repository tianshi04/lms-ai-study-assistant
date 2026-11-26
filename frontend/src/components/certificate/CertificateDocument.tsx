"use client";

import { useId, useMemo, useState } from "react";
import Image from "next/image";

const CERTIFICATE_VERIFY_BASE_URL = (
  process.env.NEXT_PUBLIC_CERTIFICATE_VERIFY_BASE_URL || "https://110-172-29-145.sslip.io"
).replace(/\/+$/, "");

export interface CertificateDocumentData {
  certificateId: string;
  learnerName: string;
  courseTitle: string;
  issueDate: string;
  partnerName: string;
  partnerLogoUrl: string;
  signerName?: string;
  signerTitle?: string;
  signatureImageUrl?: string;
  qrCodeUrl: string;
  openBadgesJsonLd?: string;
}

function buildGuillochePaths(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  layers: number,
  petals = 12,
): string[] {
  const paths: string[] = [];
  const steps = 160;
  for (let layer = 0; layer < layers; layer += 1) {
    const t = layer / Math.max(1, layers - 1);
    const baseR = innerRadius + (outerRadius - innerRadius) * t;
    const amp = (0.085 + 0.035 * Math.sin(t * Math.PI)) * baseR;
    const phase = layer * (Math.PI / (petals * 1.5));
    const segments: string[] = [];
    for (let step = 0; step <= steps; step += 1) {
      const theta = (2 * Math.PI * step) / steps;
      const r =
        baseR +
        amp * Math.cos(petals * theta + phase) +
        amp * 0.25 * Math.sin((petals / 2) * theta);
      const px = (cx + r * Math.cos(theta)).toFixed(2);
      const py = (cy + r * Math.sin(theta)).toFixed(2);
      segments.push(`${step === 0 ? "M" : "L"}${px},${py}`);
    }
    segments.push("Z");
    paths.push(segments.join(" "));
  }
  return paths;
}

function getPartnerInitials(partnerName: string): string {
  const words = partnerName
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return (partnerName.trim().slice(0, 2) || "LA").toUpperCase();
}

function getSealBeadCoordinates(cx: number, cy: number, radius: number, count = 52) {
  return Array.from({ length: count }, (_, idx) => {
    const rad = ((2 * Math.PI) / count) * idx;
    return {
      idx,
      cx: (cx + radius * Math.cos(rad)).toFixed(2),
      cy: (cy + radius * Math.sin(rad)).toFixed(2),
    };
  });
}

function LmsAiMedallionSeal({ size = 148 }: { size?: number }) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const topArcId = `seal-top-${uid}`;
  const bottomArcId = `seal-bottom-${uid}`;
  const beads = useMemo(() => getSealBeadCoordinates(100, 100, 88, 52), []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-label="Con dấu xác thực LMS AI Platform"
      className="select-none shrink-0"
    >
      <defs>
        {/* Top arc (reads clockwise left -> right along upper semicircle) */}
        <path id={topArcId} d="M 33,100 A 67,67 0 0,1 167,100" />
        {/* Bottom arc (reads counter-clockwise upright along lower semicircle) */}
        <path id={bottomArcId} d="M 30,100 A 70,70 0 0,0 170,100" />
      </defs>

      {/* Outer beaded ring */}
      {beads.map((b) => (
        <circle key={b.idx} cx={b.cx} cy={b.cy} r="1.5" fill="#1E293B" />
      ))}

      {/* Navy seal circle */}
      <circle cx="100" cy="100" r="80" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2" />
      {/* Antique gold hairline */}
      <circle cx="100" cy="100" r="75.5" fill="none" stroke="#C89B3C" strokeWidth="1.2" />
      {/* Core medallion */}
      <circle cx="100" cy="100" r="54" fill="#FFFFFF" stroke="#0056D2" strokeWidth="1.4" />

      {/* Curved arc legends */}
      <text
        fill="#1E293B"
        fontSize="8.4"
        fontWeight="700"
        letterSpacing="1.3"
        className="font-sans"
      >
        <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
          OPENBADGES 3.0 VERIFIED
        </textPath>
      </text>
      <text
        fill="#1E293B"
        fontSize="8.4"
        fontWeight="700"
        letterSpacing="1.6"
        className="font-sans"
      >
        <textPath href={`#${bottomArcId}`} startOffset="50%" textAnchor="middle">
          AI-POWERED LEARNING
        </textPath>
      </text>

      {/* Gold 4-point divider stars at 9 & 3 o'clock */}
      <path
        d="M33,96 L34.2,98.8 L37,100 L34.2,101.2 L33,104 L31.8,101.2 L29,100 L31.8,98.8 Z"
        fill="#C89B3C"
      />
      <path
        d="M167,96 L168.2,98.8 L171,100 L168.2,101.2 L167,104 L165.8,101.2 L163,100 L165.8,98.8 Z"
        fill="#C89B3C"
      />

      {/* Vector Graduation Cap + AI Sparkle */}
      <g transform="translate(100, 77)">
        <polygon points="0,-10 17,-2 0,6 -17,-2" fill="#0056D2" />
        <path d="M-9.5,3 L-9.5,9 C-4,12.5 4,12.5 9.5,9 L9.5,3 L0,7.5 Z" fill="#1E293B" />
        <line x1="14" y1="-1" x2="14" y2="9" stroke="#C89B3C" strokeWidth="1.5" />
        <circle cx="14" cy="10" r="1.8" fill="#C89B3C" />
        {/* 4-point gold AI sparkle */}
        <path
          d="M18,-13 L19.4,-9.4 L23,-8 L19.4,-6.6 L18,-3 L16.6,-6.6 L13,-8 L16.6,-9.4 Z"
          fill="#C89B3C"
        />
      </g>

      {/* Center LMS AI Wordmark */}
      <text
        x="100"
        y="112"
        textAnchor="middle"
        fill="#0F172A"
        fontSize="19"
        fontWeight="900"
        letterSpacing="-0.3"
      >
        LMS AI
      </text>
      <text
        x="100"
        y="126"
        textAnchor="middle"
        fill="#64748B"
        fontSize="7.8"
        fontWeight="700"
        letterSpacing="2.2"
      >
        PLATFORM
      </text>
    </svg>
  );
}

export function CertificateDocument({ cert }: { cert: CertificateDocumentData }) {
  const rawClipId = useId();
  const clipId = `cert-inner-clip-${rawClipId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [logoError, setLogoError] = useState(false);
  const [sigError, setSigError] = useState(false);

  const isSpecialization =
    cert.certificateId.toUpperCase().includes("SPEC") ||
    Boolean(
      cert.openBadgesJsonLd && cert.openBadgesJsonLd.toLowerCase().includes("specialization"),
    );

  const partnerDisplay = cert.partnerName?.trim() || "LMS AI Platform";
  const partnerInitials = getPartnerInitials(partnerDisplay);
  const verificationUrl = `${CERTIFICATE_VERIFY_BASE_URL}/verify/${cert.certificateId}`;
  const rawSignerName = cert.signerName?.trim() || "";
  const hasNamedSigner = rawSignerName.length > 0;
  const signatureFallbackText = hasNamedSigner ? rawSignerName : "Ban Giám Hiệu";
  const signerNameDisplay = hasNamedSigner ? rawSignerName : partnerDisplay;
  const signerTitleDisplay =
    cert.signerTitle?.trim() ||
    (hasNamedSigner ? "Đại diện đơn vị cấp chứng chỉ" : "Đơn vị cấp chứng chỉ");

  const warmRosette = useMemo(() => buildGuillochePaths(260, 445, 78, 225, 13, 12), []);
  const coolRosette = useMemo(() => buildGuillochePaths(818, 290, 92, 215, 12, 12), []);

  return (
    <article
      aria-label={`Văn bằng chứng chỉ ${cert.certificateId}`}
      className="relative bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:ring-1 dark:ring-white/15 overflow-hidden select-none sm:select-text"
    >
      {/* Diplomatic Notched Frame + Dual Mathematical Guilloche Watermark */}
      <svg
        viewBox="0 0 1000 700"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="28" y="28" width="944" height="644" />
          </clipPath>
        </defs>

        {/* Guilloche watermarks clipped strictly inside inner frame */}
        <g clipPath={`url(#${clipId})`}>
          <g fill="none" stroke="#ECE0C9" strokeWidth="0.75">
            {warmRosette.map((d, idx) => (
              <path key={idx} d={d} />
            ))}
          </g>
          <g fill="none" stroke="#E5EDF8" strokeWidth="0.75">
            {coolRosette.map((d, idx) => (
              <path key={idx} d={d} />
            ))}
          </g>
        </g>

        {/* Outer notched diplomatic frame */}
        <path
          d="M 30,16 L 970,16 L 970,30 L 984,30 L 984,670 L 970,670 L 970,684 L 30,684 L 30,670 L 16,670 L 16,30 L 30,30 Z"
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1.5"
        />
        {/* Inner hairline border */}
        <rect
          x="28"
          y="28"
          width="944"
          height="644"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="0.9"
        />

        {/* Gold 4-point corner accent pips */}
        {[
          [23, 23],
          [977, 23],
          [23, 677],
          [977, 677],
        ].map(([px, py], i) => (
          <path
            key={i}
            d={`M${px},${py - 3.5} L${px + 1},${py - 1} L${px + 3.5},${py} L${px + 1},${py + 1} L${px},${py + 3.5} L${px - 1},${py + 1} L${px - 3.5},${py} L${px - 1},${py - 1} Z`}
            fill="#C89B3C"
          />
        ))}
      </svg>

      {/* Main Content Area */}
      <div className="relative z-10 px-8 py-9 sm:px-14 sm:py-11 md:min-h-[590px] flex flex-col justify-between gap-8">
        {/* Top + Center row alongside desktop right pennant ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_228px] lg:grid-cols-[1fr_246px] gap-8 items-start">
          {/* LEFT EDITORIAL COLUMN */}
          <div className="space-y-6 pt-1 md:pr-4">
            {/* Partner Branding Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {cert.partnerLogoUrl && !logoError ? (
                  <Image
                    src={cert.partnerLogoUrl}
                    alt={partnerDisplay}
                    width={140}
                    height={40}
                    unoptimized
                    onError={() => setLogoError(true)}
                    className="h-9 sm:h-10 w-auto object-contain shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg border border-[#0056D2] bg-[#F8FAFC] flex items-center justify-center font-extrabold text-xs text-[#0056D2] shrink-0">
                    {partnerInitials}
                  </div>
                )}
                <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                  {partnerDisplay}
                </span>
              </div>

              {/* Compact badge for narrow mobile screens where right ribbon is hidden */}
              <div className="md:hidden inline-flex items-center gap-1.5 rounded-full bg-[#EEF3F9] border border-slate-200 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C89B3C]" />
                {isSpecialization ? "Chứng chỉ chuyên ngành" : "Chứng chỉ khóa học"}
              </div>
            </div>

            {/* Recipient & Course Statement */}
            <div className="space-y-3 pt-1">
              <p className="text-xs sm:text-[13px] font-medium text-slate-500">
                Ngày cấp: <span className="font-semibold text-slate-700">{cert.issueDate}</span>
              </p>

              <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-slate-900 uppercase tracking-tight leading-tight break-words">
                {cert.learnerName}
              </h2>

              {/* Personal Antique-Gold Accent Rule */}
              <div className="w-12 h-[3px] rounded-full bg-[#C89B3C]" aria-hidden="true" />

              <p className="text-sm text-slate-600 pt-1">
                {isSpecialization
                  ? "đã hoàn thành xuất sắc chương trình chuyên ngành"
                  : "đã hoàn thành xuất sắc khóa học"}
              </p>

              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug break-words">
                {cert.courseTitle}
              </h3>

              <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed max-w-xl">
                {isSpecialization
                  ? `một chương trình chuyên ngành được bảo chứng bởi ${partnerDisplay} và cấp chứng nhận trên nền tảng LMS AI Platform.`
                  : `một khóa học trực tuyến được bảo chứng bởi ${partnerDisplay} và cấp chứng nhận trên nền tảng LMS AI Platform.`}
              </p>
            </div>
          </div>

          {/* RIGHT HANGING PENNANT RIBBON (Desktop/Tablet) */}
          <div className="hidden md:flex justify-center -mt-11">
            <div
              className="relative w-full bg-[#EEF3F9] border-x border-slate-300 pt-8 pb-12 px-4 flex flex-col items-center text-center shadow-2xs"
              style={{
                clipPath: "polygon(0 0, 100% 0, 100% 89%, 50% 100%, 0 89%)",
              }}
            >
              {/* Royal-blue + Antique-gold crown bar */}
              <div className="absolute top-0 inset-x-0">
                <div className="h-[6px] bg-[#0056D2]" />
                <div className="h-[2px] bg-[#C89B3C]" />
              </div>

              {/* Spaced diplomatic title */}
              <div className="space-y-1 pt-2 pb-6">
                <p className="text-sm font-extrabold tracking-[0.2em] text-slate-800 uppercase">
                  CHỨNG CHỈ
                </p>
                <p className="text-sm font-extrabold tracking-[0.2em] text-slate-800 uppercase">
                  {isSpecialization ? "CHUYÊN NGÀNH" : "KHÓA HỌC"}
                </p>
                <p className="text-[9px] font-bold tracking-[0.16em] text-slate-500 uppercase pt-0.5">
                  {isSpecialization ? "SPECIALIZATION CERTIFICATE" : "COURSE CERTIFICATE"}
                </p>
              </div>

              {/* Circular Embossed LMS AI Medallion Seal */}
              <LmsAiMedallionSeal size={156} />

              {/* Bottom Gold Ornament above V-tip */}
              <div className="flex items-center gap-2 mt-6 mb-2" aria-hidden="true">
                <span className="w-6 h-px bg-[#C89B3C]" />
                <span className="text-[11px] text-[#C89B3C] leading-none">✦</span>
                <span className="w-6 h-px bg-[#C89B3C]" />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Signature on Left + Verification/QR on Right */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-2">
          {/* Bottom-Left Signer Block */}
          <div className="space-y-1 max-w-sm">
            {cert.signatureImageUrl && !sigError ? (
              <div className="h-11 flex items-end mb-1">
                <Image
                  src={cert.signatureImageUrl}
                  alt={signerNameDisplay}
                  width={155}
                  height={44}
                  unoptimized
                  onError={() => setSigError(true)}
                  className="max-h-11 w-auto object-contain object-left"
                />
              </div>
            ) : (
              <div className="h-10 max-w-52 flex items-end font-serif italic text-lg text-slate-800 pb-0.5 truncate">
                {signatureFallbackText}
              </div>
            )}

            <div className="relative w-52 h-px bg-slate-300">
              <span
                className="absolute -left-0.5 -top-[2.5px] w-1.5 h-1.5 rounded-full bg-[#C89B3C]"
                aria-hidden="true"
              />
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-900 pt-1">{signerNameDisplay}</p>
            <p className="text-[11px] text-slate-500 font-medium">{signerTitleDisplay}</p>
            <p className="text-[11px] font-bold text-slate-600 font-mono pt-1">
              Mã chứng chỉ: {cert.certificateId}
            </p>
          </div>

          {/* Bottom-Right Verification & QR Block (Sits neatly below ribbon V-tip on desktop) */}
          <div className="flex items-center sm:items-end justify-between sm:justify-end gap-3.5 sm:text-right">
            <div className="space-y-0.5 text-[11px] text-slate-500 max-w-[390px]">
              <p className="font-medium text-slate-600">Xác thực tại:</p>
              <a
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-mono font-bold text-[#0056D2] underline underline-offset-2 hover:opacity-80 break-all sm:break-normal sm:whitespace-nowrap"
              >
                {verificationUrl}
              </a>
              <p className="text-[10px] leading-snug text-slate-500 pt-0.5">
                LMS AI Platform đã xác nhận danh tính học viên và quá trình hoàn thành khóa học.
              </p>
            </div>

            {cert.qrCodeUrl && (
              <Image
                src={cert.qrCodeUrl}
                alt={`Mã QR xác thực ${cert.certificateId}`}
                width={68}
                height={68}
                unoptimized
                className="w-16 h-16 rounded-lg border border-slate-200 p-1 bg-white shrink-0"
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
