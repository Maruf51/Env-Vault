import Image from "next/image";
import Link from "next/link";

export function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Env Vault home"
      className="inline-flex items-center gap-3 font-semibold tracking-tight"
    >
      <Image
        src="/env-vault-mark.svg"
        alt=""
        width={compact ? 36 : 40}
        height={compact ? 36 : 40}
        priority
      />
      <span>Env Vault</span>
    </Link>
  );
}
