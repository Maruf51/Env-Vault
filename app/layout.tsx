import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Env Vault",
    template: "%s | Env Vault",
  },
  description: "Securely store and manage your project environment variables.",
  icons: {
    icon: "/env-vault-mark.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body className="min-h-full">{children}</body></html>;
}
