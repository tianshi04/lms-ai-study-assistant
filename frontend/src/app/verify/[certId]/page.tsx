import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicRpcServerClient } from "@/lib/server_connect_client";
import { CertificateService } from "@/gen/certificate/v1/certificate_pb";
import { VerifyDetailClient } from "./VerifyDetailClient";

async function getCachedVerifiedCertificate(certId: string) {
  "use cache";
  cacheLife("days");
  cacheTag("certificates", `cert-${certId}`);

  try {
    const client = getPublicRpcServerClient(CertificateService);
    const res = await client.verifyCertificatePublic({ certificateId: certId });
    return {
      isValid: res.isValid,
      statusMessage: res.statusMessage || "",
      certificate: res.certificate
        ? {
            certificateId: res.certificate.certificateId,
            learnerName: res.certificate.learnerName,
            courseTitle: res.certificate.courseTitle,
            issueDate: res.certificate.issueDate,
            partnerName: res.certificate.partnerName,
            partnerLogoUrl: res.certificate.partnerLogoUrl,
            signerName: res.certificate.signerName,
            signerTitle: res.certificate.signerTitle,
            signatureImageUrl: res.certificate.signatureImageUrl,
            qrCodeUrl: res.certificate.qrCodeUrl,
            openBadgesJsonLd: res.certificate.openBadgesJsonLd,
          }
        : null,
    };
  } catch (err) {
    console.error("Lỗi xác thực chứng chỉ:", err);
    return {
      isValid: false,
      statusMessage: "Không thể tải thông tin chứng chỉ",
      certificate: null,
    };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certId: string }>;
}): Promise<Metadata> {
  const { certId } = await params;
  return {
    title: `Xác minh Chứng chỉ #${certId} | LMS AI Platform`,
    description: `Tra cứu tính hợp lệ và chữ ký số bảo chứng cho chứng chỉ #${certId}.`,
  };
}

export default async function VerifyPage({ params }: { params: Promise<{ certId: string }> }) {
  const { certId } = await params;
  const initialData = await getCachedVerifiedCertificate(certId);

  return <VerifyDetailClient certId={certId} initialData={initialData} />;
}
