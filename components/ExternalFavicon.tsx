"use client";

import { useEffect, useState } from "react";

type ExternalFaviconProps = {
  websiteUrl?: string;
  fallback: string;
  className?: string;
};

export function ExternalFavicon({ websiteUrl, fallback, className = "" }: ExternalFaviconProps) {
  const [failed, setFailed] = useState(false);
  const normalizedUrl = (() => {
    try {
      if (!websiteUrl?.trim()) return "";
      const parsed = new URL(websiteUrl.trim());
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
    } catch {
      return "";
    }
  })();

  useEffect(() => {
    setFailed(false);
  }, [normalizedUrl]);

  if (!normalizedUrl || failed) {
    return (
      <span
        className={`flex items-center justify-center font-semibold text-zinc-400 ${className}`}
        aria-hidden="true"
      >
        {fallback.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      key={normalizedUrl}
      alt=""
      className={className}
      src={`/api/favicon?url=${encodeURIComponent(normalizedUrl)}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
