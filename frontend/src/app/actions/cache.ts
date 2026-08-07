"use server";

import { updateTag, revalidateTag } from "next/cache";

/**
 * Server Action to invalidate Next.js Cache Components tags for Course catalog & Course details.
 * Triggers instant cache purge on Next.js server when instructors or admins mutate course data.
 */
export async function revalidateCourseCacheAction(courseId?: string) {
  try {
    updateTag("courses");
    updateTag("categories");
    revalidateTag("courses", { expire: 0 });
    revalidateTag("categories", { expire: 0 });
    if (courseId) {
      updateTag(`course-${courseId}`);
      revalidateTag(`course-${courseId}`, { expire: 0 });
    }
  } catch (err) {
    console.warn("Failed to invalidate course cache tags:", err);
  }
}

/**
 * Server Action to invalidate Next.js Cache Components tags for Certificates.
 */
export async function revalidateCertificateCacheAction(certId?: string) {
  try {
    updateTag("certificates");
    revalidateTag("certificates", { expire: 0 });
    if (certId) {
      updateTag(`cert-${certId}`);
      revalidateTag(`cert-${certId}`, { expire: 0 });
    }
  } catch (err) {
    console.warn("Failed to invalidate certificate cache tags:", err);
  }
}

/**
 * Server Action to invalidate Next.js Cache Components tags for Partners.
 */
export async function revalidatePartnerCacheAction(slug?: string) {
  try {
    updateTag("partners");
    revalidateTag("partners", { expire: 0 });
    if (slug) {
      updateTag(`partner-${slug}`);
      revalidateTag(`partner-${slug}`, { expire: 0 });
    }
  } catch (err) {
    console.warn("Failed to invalidate partner cache tags:", err);
  }
}
