import { discoverFavicon } from "@/lib/favicon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validWebUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const website = requestUrl.searchParams.get("url");
  if (!website || website.length > 2048) return new Response(null, { status: 400 });

  const pageUrl = validWebUrl(website);
  if (!pageUrl) return new Response(null, { status: 400 });

  const iconUrl = validWebUrl(await discoverFavicon(pageUrl.toString()));
  if (!iconUrl) return new Response(null, { status: 404 });

  // Do not follow icon redirects: this endpoint only proxies a verified public icon URL.
  try {
    const response = await fetch(iconUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { "user-agent": "EnvVault-Favicon/1.0", accept: "image/*" },
    });
    const type = response.headers.get("content-type") ?? "";
    const length = Number(response.headers.get("content-length") ?? "0");
    if (!response.ok || response.status >= 300 || !type.toLowerCase().startsWith("image/") || length > 1024 * 1024) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 1024 * 1024) return new Response(null, { status: 413 });
    return new Response(bytes, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
  }
}
