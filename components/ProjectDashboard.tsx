"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { BrandLink } from "@/components/BrandLink";

type Project = {
  id: string;
  name: string;
  description: string;
  websiteUrl?: string;
  logoUrl?: string;
  updatedAt: string;
  variableCount: number;
};

export function ProjectDashboard({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, websiteUrl }),
      });
      const result = (await response.json()) as Project | { error?: string };
      if (!response.ok) {
        setError("error" in result ? result.error ?? "Unable to create project." : "Unable to create project.");
        return;
      }
      setProjects((current) => [result as Project, ...current]);
      setName("");
      setDescription("");
      setWebsiteUrl("");
      setShowForm(false);
    } catch {
      setError("Unable to create project. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
        <BrandLink compact />
        <button
          className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
          onClick={() => void signOut({ callbackUrl: "/login" })}
          type="button"
        >
          Sign out
        </button>
      </header>

      <section className="mt-10 sm:mt-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Your workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Projects</h1>
            <p className="mt-2 text-sm text-zinc-400">Keep every environment secret organized in one place.</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-300"
            onClick={() => {
              setShowForm((visible) => !visible);
              setError("");
            }}
            type="button"
          >
            <span aria-hidden="true" className="text-lg leading-none">{showForm ? "−" : "+"}</span>
            {showForm ? "Cancel" : "New project"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createProject} className="mt-7 max-w-2xl space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-xl shadow-black/10 sm:p-6">
            <div>
              <h2 className="font-medium">Create a project</h2>
              <p className="mt-1 text-sm text-zinc-500">Start a secure space for your environment variables.</p>
            </div>
            <label className="block text-sm text-zinc-300">
              Project name
              <input
                autoFocus
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/30"
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Production API"
                required
                value={name}
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Description <span className="text-zinc-500">(optional)</span>
              <textarea
                className="mt-2 min-h-24 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/30"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this project for?"
                value={description}
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Website URL <span className="text-zinc-500">(optional)</span>
              <input
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://your-app.vercel.app"
                type="url"
                value={websiteUrl}
              />
              <span className="mt-1 block text-xs text-zinc-500">We'll use the website favicon as the project logo.</span>
            </label>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <button
              className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-wait disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              {pending ? "Creating..." : "Create project"}
            </button>
          </form>
        )}

        {!showForm && error && <p role="alert" className="mt-6 text-sm text-red-400">{error}</p>}
        {projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-xl text-zinc-400" aria-hidden="true">⌘</span>
            <h2 className="mt-4 font-medium">Nothing here yet</h2>
            <p className="mt-2 text-sm text-zinc-500">Create your first project to start organizing environment variables.</p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  className="group block rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20 sm:p-6"
                  href={`/dashboard/${project.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-sm text-zinc-300" aria-hidden="true">
                      {project.logoUrl ? <img alt="" className="size-7 object-contain" src={project.logoUrl} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : project.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-zinc-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-300" aria-hidden="true">↗</span>
                  </div>
                  <h2 className="mt-5 truncate text-base font-medium tracking-tight">{project.name}</h2>
                  <p className="mt-1 min-h-5 truncate text-sm text-zinc-500">
                    {project.description || "No description"}
                  </p>
                  {project.websiteUrl && <span className="mt-2 block truncate text-xs text-zinc-500">{project.websiteUrl}</span>}
                  <div className="mt-6 flex items-center justify-between border-t border-zinc-800/80 pt-4">
                    <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
                      <span className="size-1.5 rounded-full bg-zinc-500" />
                      {project.variableCount} {project.variableCount === 1 ? "variable" : "variables"}
                    </span>
                    <span className="text-xs text-zinc-600">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
