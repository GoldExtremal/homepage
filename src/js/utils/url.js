export function looksLikeUrl(text) {
  if (/^https?:\/\//i.test(text)) return true;
  if (text.includes(" ")) return false;
  return /\.[a-z]{2,}$/i.test(text) || text.includes("localhost") || text.startsWith("127.");
}

export function normalizeUrl(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeOptionalUrl(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return normalizeUrl(trimmed);
}

export function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function extractRootDomain(hostname) {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 2) return hostname;

  const secondLevelTlds = new Set(["co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "co.jp", "com.br", "com.mx"]);
  const tail2 = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  const tail3 = `${parts[parts.length - 3]}.${tail2}`;

  if (secondLevelTlds.has(tail2) && parts.length >= 3) {
    return tail3;
  }

  return tail2;
}

export function shouldPreferHostFirst(cleanHost, rootDomain) {
  if (cleanHost === rootDomain) return false;
  const servicePrefixes = new Set([
    "music",
    "mail",
    "drive",
    "docs",
    "calendar",
    "maps",
    "translate",
    "video",
    "tv",
    "radio",
    "player",
    "app",
    "studio",
  ]);
  const firstLabel = cleanHost.split(".")[0]?.toLowerCase() || "";
  return servicePrefixes.has(firstLabel);
}
