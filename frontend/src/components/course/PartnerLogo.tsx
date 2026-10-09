"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { Chip } from "@/components/ui/Chip";

interface PartnerLogoProps {
  logoUrl?: string;
  partnerName?: string;
}

export function PartnerLogo({ logoUrl, partnerName }: PartnerLogoProps) {
  const [imgError, setImgError] = useState(false);

  if (!imgError && logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={partnerName || "Partner"}
        width={140}
        height={24}
        onError={() => setImgError(true)}
        className="h-6 max-w-[140px] w-auto object-contain dark:brightness-200 dark:contrast-200 transition-opacity"
        unoptimized
      />
    );
  }

  return (
    <Chip
      variant="assist"
      className="h-7 text-xs font-bold bg-primary-container text-on-primary-container border-primary/20 hover:bg-primary-container pointer-events-none cursor-default shadow-xs"
      leadingIcon={<Building2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
    >
      {partnerName || "Coursera Partner"}
    </Chip>
  );
}
