/** Validate links before they are persisted or navigated to. */
export function isInternalPath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\\\r\n]/.test(value)) return false;

  try {
    const url = new URL(value, "https://scora.local");
    return url.origin === "https://scora.local";
  } catch {
    return false;
  }
}

export function safeInternalPath(value: string | null | undefined, fallback = "/dashboard"): string {
  return value && isInternalPath(value) ? value : fallback;
}

export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
