const PARSE_BASE = "http://redirect.invalid";

function hasUnsafeCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // Backslash is normalised to "/" by browsers ("/\evil.com" -> "//evil.com");
    // control characters (tab/CR/LF) are stripped by URL parsers and can hide a "//".
    if (code === 0x5c || code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Returns `raw` only when it is a same-origin absolute path ("/foo?bar#baz"), else `fallback`.
 *
 * A plain `startsWith("/") && !startsWith("//")` check is bypassable with `/\evil.com`
 * (browsers treat the backslash as a slash), so the value is also parsed against a
 * dummy origin and must stay on it.
 */
export function sanitizeRedirectPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || hasUnsafeCharacter(raw)) {
    return fallback;
  }
  try {
    const url = new URL(raw, PARSE_BASE);
    if (url.origin !== PARSE_BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
