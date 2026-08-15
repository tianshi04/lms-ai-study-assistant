/**
 * Web Share API utility with graceful fallback to Clipboard copy.
 */

export interface ShareContentOptions {
  title: string;
  text?: string;
  url: string;
  onFallbackCopy?: () => void;
}

export async function shareContent({
  title,
  text,
  url,
  onFallbackCopy,
}: ShareContentOptions): Promise<boolean> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const shareData = { title, text, url };
      if (navigator.canShare && !navigator.canShare(shareData)) {
        onFallbackCopy?.();
        return false;
      }
      await navigator.share(shareData);
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        onFallbackCopy?.();
      }
      return false;
    }
  } else {
    onFallbackCopy?.();
    return false;
  }
}
