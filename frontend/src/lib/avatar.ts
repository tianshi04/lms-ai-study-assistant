import { createAvatar } from "@dicebear/core";
import * as avataaars from "@dicebear/avataaars";

/**
 * Generates a Data URI for a DiceBear avataaars SVG 100% locally in JavaScript.
 * Requires 0 network requests.
 */
export function getAvatarDataUri(seed: string): string {
  const avatar = createAvatar(avataaars, {
    seed: seed || "user",
  });
  return avatar.toDataUri();
}
