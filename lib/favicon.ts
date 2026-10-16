import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19));
  }
  const value = address.toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fc") ||
    value.startsWith("fd") || /^fe[89ab]/.test(value) ||
    value.startsWith("::ffff:");
}

async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host.endsWith(".internal") || host.endsWith(".test")) return false;
  const ipVersion = isIP(host);
  if (ipVersion) return !isPrivateAddress(host);
  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
  } catch {
    return false;
  }
}

function decodeHtml(value: string): string {
  return value.replace(/&amp;/gi, "&").replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"').replace(/&#x2f;/gi, "/").replace(/&#x3a;/gi, ":");
}

function findIcon(html: string, pageUrl: URL): string | null {
  const links: { href: string; priority: number }[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/);
    if (!rel.some((item) => item === "icon" || item === "shortcut" || item === "apple-touch-icon" || item === "mask-icon")) continue;
    if (!attrs.href) continue;
    try {
      const iconUrl = new URL(decodeHtml(attrs.href), pageUrl);
      if (!["http:", "https:"].includes(iconUrl.protocol) || iconUrl.username || iconUrl.password) continue;
      const priority = rel.includes("icon") ? 0 : rel.includes("shortcut") ? 1 : rel.includes("apple-touch-icon") ? 2 : 3;
      links.push({ href: iconUrl.toString(), priority });
    } catch { /* Ignore invalid icon URLs. */ }
  }
  links.sort((a, b) => a.priority - b.priority);
  return links[0]?.href ?? null;
}

/** Fetch a public website's HTML and discover its declared favicon without using a generic favicon fallback service. */
export async function discoverFavicon(input: string): Promise<string> {
  let current: URL;
  try { current = new URL(input); } catch { return ""; }
  if (!["http:", "https:"].includes(current.protocol) || current.username || current.password) return "";

  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!(await isPublicHost(current.hostname))) return "";
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: { "user-agent": "EnvVault-FaviconBot/1.0", accept: "text/html,application/xhtml+xml" },
      });
    } catch { return new URL("/favicon.ico", current).toString(); }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) return new URL("/favicon.ico", current).toString();
      try {
        const next = new URL(location, current);
        if (!["http:", "https:"].includes(next.protocol) || next.username || next.password) return "";
        current = next;
        continue;
      } catch { return ""; }
    }

    if (!response.ok) return new URL("/favicon.ico", current).toString();
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) return new URL("/favicon.ico", current).toString();
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > 1024 * 1024) return new URL("/favicon.ico", current).toString();
    try {
      const html = (await response.text()).slice(0, 1024 * 1024);
      const icon = findIcon(html, current);
      if (icon) {
        const iconUrl = new URL(icon);
        if (await isPublicHost(iconUrl.hostname)) return iconUrl.toString();
      }
    } catch { /* Use the site's conventional favicon path. */ }
    return new URL("/favicon.ico", current).toString();
  }
  return "";
}
