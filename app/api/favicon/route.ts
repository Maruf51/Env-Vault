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

async function fetchImage(url: URL): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      // Follow redirects for common CDN and Google favicon responses.
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; EnvVault-Favicon/1.0)",
        accept: "image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const length = Number(response.headers.get("content-length") ?? "0");
    if (!response.ok || !type.startsWith("image/") || length > 1024 * 1024) return null;
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 1024 * 1024) return null;
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
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

  // First try the website's own declared favicon.
  const discovered = validWebUrl(await discoverFavicon(pageUrl.toString()));
  if (discovered) {
    const image = await fetchImage(discovered);
    if (image) return image;
  }

  // Reliable server-side fallback: Google's favicon service, not a client-side request.
  // Only the hostname is passed to Google; no page path or query parameters are shared.
  const googleUrl = new URL("https://www.google.com/s2/favicons/");
  googleUrl.searchParams.set("domain_url", pageUrl.origin);
  googleUrl.searchParams.set("sz", "128");
  const googleImage = await fetchImage(googleUrl);
  if (googleImage) return googleImage;

  // Last attempt: conventional favicon.ico at the site's origin.
  const conventional = new URL("/favicon.ico", pageUrl.origin);
  const finalImage = await fetchImage(conventional);
  return finalImage ?? new Response(null, {
    status: 404,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
