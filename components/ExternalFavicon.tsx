"use client";

import { useEffect, useState } from "react";

type ExternalFaviconProps = {
  websiteUrl?: string;
  fallback: string;
  className?: string;
};

/**
 * Try Unavatar first because Google's S2 endpoint often returns its generic globe
 * when it cannot find a site's icon. Fall back to Google's domain favicon service.
 */
export function ExternalFavicon({ websiteUrl, fallback, className = "" }: ExternalFaviconProps) {
  const [providerIndex, setProviderIndex] = useState(0);

  let domain = "";
  try {
    if (websiteUrl) {
      const parsed = new URL(websiteUrl);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") domain = parsed.hostname;
    }
  } catch {
    domain = "";
  }

  useEffect(() => {
    setProviderIndex(0);
  }, [domain]);

  const sources = domain
    ? [
        `https://unavatar.io/${encodeURIComponent(domain)}`,
        `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(`https://${domain}`)}&sz=128`,
      ]
    : [];

  if (!sources.length || providerIndex >= sources.length) {
    return <span className={`flex items-center justify-center font-semibold text-zinc-400 ${className}`} aria-hidden="true">{fallback.slice(0, 1).toUpperCase()}</span>;
  }

  return (
    <img
      key={sources[providerIndex]}
      alt=""
      className={className}
      src={sources[providerIndex]}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setProviderIndex((current) => current + 1)}
    />
  );
}
