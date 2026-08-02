"use server";

import { revalidateTag, updateTag } from "next/cache";

/**
 * Server action for immediate cache invalidation of course catalog and course details.
 * Can be called from Server Actions upon course creation or update.
 */
export async function revalidateCoursesCache(courseId?: string) {
  updateTag("courses");
  updateTag("categories");
  if (courseId) {
    updateTag(`course-${courseId}`);
  }
}

/**
 * Background revalidation trigger for courses cache.
 */
export async function triggerBackgroundCoursesRevalidate(courseId?: string) {
  revalidateTag("courses", "default");
  revalidateTag("categories", "default");
  if (courseId) {
    revalidateTag(`course-${courseId}`, "default");
  }
}
