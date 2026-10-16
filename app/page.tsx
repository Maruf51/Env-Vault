import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

async function HomeRedirect() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950" />}>
      <HomeRedirect />
    </Suspense>
  );
}
