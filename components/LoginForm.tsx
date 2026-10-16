"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BrandLink } from "@/components/BrandLink";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const callbackUrl =
        new URL(window.location.href).searchParams.get("callbackUrl") ?? "/dashboard";
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setError("Email or password is incorrect.");
        return;
      }
      router.push(result.url ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(161,161,170,0.09),transparent_55%)]" />
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 md:min-h-[620px] md:grid-cols-[1fr_0.9fr]">
        <div className="hidden flex-col justify-between border-r border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-950 p-10 md:flex lg:p-14">
          <div className="max-w-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Private by design</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">Your environment, under your control.</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400">Keep project secrets organized and encrypted with keys that stay yours.</p>
          </div>
          <p className="text-xs text-zinc-600">Encrypted at rest · Self-hosted · Always yours</p>
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-10 md:px-10 lg:px-14">
          <div className="w-full max-w-sm">
            <div className="md:hidden"><BrandLink compact /></div>
            <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 md:mt-0">Welcome back</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-2 text-sm text-zinc-400">Enter your details to access your workspace.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm text-zinc-300">
            Email
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/30"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Password
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/30"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button
            className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-wait disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-zinc-500">
          New to Env Vault?{" "}
          <Link href="/register" className="font-medium text-zinc-200 transition hover:text-white">Create an account <span aria-hidden="true">→</span></Link>
        </p>
          </div>
        </div>
      </section>
    </main>
  );
}
