"use client";

import { ImageUploadField, type ImageUploadFieldProps } from "@/components/ui/ImageUploadField";

type SignatureUploadFieldProps = Omit<ImageUploadFieldProps, "itemLabel">;

export function SignatureUploadField({
  folder = "public/signatures",
  ...props
}: SignatureUploadFieldProps) {
  return <ImageUploadField folder={folder} itemLabel="ảnh chữ ký" {...props} />;
}
