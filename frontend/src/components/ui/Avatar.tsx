import React from "react";
import Image from "next/image";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = "md", className = "" }) => {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const pixelSizes = {
    sm: 28,
    md: 36,
    lg: 48,
  };

  if (src) {
    const dim = pixelSizes[size];
    return (
      <Image
        src={src}
        alt={name}
        width={dim}
        height={dim}
        unoptimized
        className={`${sizes[size]} rounded-full object-cover border border-slate-700 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white flex items-center justify-center shadow-sm shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
};
