"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { BrandLink } from "@/components/BrandLink";

type Project = { id: string; name: string; description: string };
type Variable = { id: string; key: string; value: string };
function responseError(result: unknown, fallback: string): string {
  if (typeof result === "object" && result !== null && "error" in result) {
    const error = result.error;
    if (typeof error === "string") return error;
  }
  return fallback;
}

export function ProjectDetails({
  projectId,
  initialProject,
  initialVariables,
}: {
  projectId: string;
  initialProject: Project;
  initialVariables: Variable[];
}) {
  const router = useRouter();
  const project = initialProject;
  const [variables, setVariables] = useState<Variable[]>(initialVariables);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function addVariable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/variables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setError(responseError(result, "Unable to add variable."));
        return;
      }
      const created = result as Variable;
      setVariables((current) =>
        [...current, created].sort((first, second) => first.key.localeCompare(second.key)),
      );
      setKey("");
      setValue("");
    } catch {
      setError("Unable to add variable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function saveVariable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    setError("");
    setPending(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/variables/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: editKey, value: editValue }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setError(responseError(result, "Unable to update variable."));
        return;
      }
      const updated = result as Variable;
      setVariables((current) =>
        current
          .map((variable) => variable.id === updated.id ? updated : variable)
          .sort((first, second) => first.key.localeCompare(second.key)),
      );
      setEditingId(null);
    } catch {
      setError("Unable to update variable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function deleteVariable(variableId: string) {
    if (!window.confirm("Delete this environment variable?")) return;
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/variables/${variableId}`, {
        method: "DELETE",
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setError(responseError(result, "Unable to delete variable."));
        return;
      }
      setVariables((current) => current.filter((item) => item.id !== variableId));
    } catch {
      setError("Unable to delete variable. Please try again.");
    }
  }

  async function deleteProject() {
    if (!window.confirm(`Delete ${project?.name} and all its variables?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const result: unknown = await response.json();
      if (!response.ok) {
        setError(responseError(result, "Unable to delete project."));
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to delete project. Please try again.");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
        <BrandLink compact />
        <button
          className="text-sm text-zinc-400 transition hover:text-zinc-100"
          onClick={() => void signOut({ callbackUrl: "/login" })}
          type="button"
        >
          Sign out
        </button>
      </header>

      {project ? (
        <>
          <section className="mt-10">
            <Link href="/dashboard" className="text-sm text-zinc-500 transition hover:text-zinc-300">← All projects</Link>
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
                    {variables.length} {variables.length === 1 ? "variable" : "variables"}
                  </span>
                </div>
                {project.description && <p className="mt-2 text-sm text-zinc-400">{project.description}</p>}
              </div>
              <div className="flex gap-2">
                <a
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
                  href={`/api/projects/${projectId}/download`}
                >
                  Download .env.local
                </a>
                <button
                  className="rounded-lg border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-400 transition hover:border-red-900 hover:text-red-300"
                  onClick={() => void deleteProject()}
                  type="button"
                >
                  Delete project
                </button>
              </div>
            </div>
          </section>

          <section className="mt-12">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Configuration</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Environment variables</h2>
              </div>
              <span className="text-sm text-zinc-500">{variables.length} total</span>
            </div>

            {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}

            <form onSubmit={addVariable} className="mt-5 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 md:grid-cols-[minmax(9rem,0.7fr)_minmax(12rem,1.3fr)_auto]">
              <label className="text-xs text-zinc-400">
                Key
                <input
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/30"
                  onChange={(event) => setKey(event.target.value)}
                  placeholder="API_KEY"
                  required
                  value={key}
                />
              </label>
              <label className="text-xs text-zinc-400">
                Value
                <input
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/30"
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Enter a secret value"
                  value={value}
                />
              </label>
              <button
                className="self-end rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-wait disabled:opacity-60"
                disabled={pending}
                type="submit"
              >
                Add variable
              </button>
            </form>

            {variables.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center">
                <p className="text-sm text-zinc-500">No variables yet. Add one above to get started.</p>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-zinc-800/80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/25">
                {variables.map((variable) => (
                  <li key={variable.id} className="p-4 transition-colors hover:bg-zinc-900/60 sm:px-5">
                    {editingId === variable.id ? (
                      <form onSubmit={saveVariable} className="grid gap-3 md:grid-cols-[minmax(9rem,0.7fr)_minmax(12rem,1.3fr)_auto]">
                        <label className="text-xs text-zinc-400">
                          Key
                          <input
                            className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none focus:border-zinc-600"
                            onChange={(event) => setEditKey(event.target.value)}
                            required
                            value={editKey}
                          />
                        </label>
                        <label className="text-xs text-zinc-400">
                          Value
                          <input
                            className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none focus:border-zinc-600"
                            onChange={(event) => setEditValue(event.target.value)}
                            value={editValue}
                          />
                        </label>
                        <div className="flex items-end gap-2">
                          <button className="rounded-lg bg-zinc-100 px-3.5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-300 disabled:opacity-60" disabled={pending} type="submit">Save</button>
                          <button className="rounded-lg border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900" onClick={() => setEditingId(null)} type="button">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-mono text-sm font-medium text-zinc-200">{variable.key}</h3>
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm leading-6 text-zinc-400">{variable.value || <span className="text-zinc-600">Empty value</span>}</pre>
                        </div>
                        <div className="flex shrink-0 gap-3">
                          <button
                            className="text-sm text-zinc-400 hover:text-zinc-100"
                            onClick={() => {
                              setEditingId(variable.id);
                              setEditKey(variable.key);
                              setEditValue(variable.value);
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm text-zinc-500 hover:text-red-300"
                            onClick={() => void deleteVariable(variable.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <div className="mt-12">
          <p className="text-sm text-zinc-400">{error || "Project not found."}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm underline">Return to projects</Link>
        </div>
      )}
    </main>
  );
}
