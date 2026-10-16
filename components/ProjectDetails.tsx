"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { BrandLink } from "@/components/BrandLink";

type Project = { id: string; name: string; description: string; websiteUrl?: string; logoUrl?: string };
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
  const [project, setProject] = useState<Project>(initialProject);
  const [showProjectEditor, setShowProjectEditor] = useState(false);
  const [projectName, setProjectName] = useState(initialProject.name);
  const [projectDescription, setProjectDescription] = useState(initialProject.description);
  const [websiteUrl, setWebsiteUrl] = useState(initialProject.websiteUrl ?? "");
  const [projectSavePending, setProjectSavePending] = useState(false);
  const [variables, setVariables] = useState<Variable[]>(initialVariables);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [importText, setImportText] = useState("");
  const [entryMode, setEntryMode] = useState<"single" | "bulk">("single");
  const [importPending, setImportPending] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function parseEnvText(text: string) {
    const parsed: { key: string; value: string }[] = [];
    const invalidLines: number[] = [];
    const seen = new Set<string>();
    text.split(/\r?\n/).forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) return;
      const normalized = line.startsWith("export ") ? line.slice(7).trimStart() : line;
      const separator = normalized.indexOf("=");
      if (separator < 1) { invalidLines.push(index + 1); return; }
      const key = normalized.slice(0, separator).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) { invalidLines.push(index + 1); return; }
      let value = normalized.slice(separator + 1).trim();
      if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
        value = value.slice(1, -1);
      }
      if (seen.has(key)) { invalidLines.push(index + 1); return; }
      seen.add(key);
      parsed.push({ key, value });
    });
    return { parsed, invalidLines };
  }

  async function readEnvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImportMessage("");
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setImportMessage("Please choose a file smaller than 1 MB.");
      event.target.value = "";
      return;
    }
    setImportText(await file.text());
    event.target.value = "";
  }

  async function importVariables() {
    const { parsed, invalidLines } = parseEnvText(importText);
    if (!parsed.length) {
      setImportMessage(invalidLines.length ? "No valid variables found. Check lines: " + invalidLines.join(", ") + "." : "Paste or choose an .env file first.");
      return;
    }
    if (parsed.length > 500) {
      setImportMessage("Please import no more than 500 variables at a time.");
      return;
    }
    setImportPending(true);
    setImportMessage("");
    setError("");
    try {
      const response = await fetch("/api/projects/" + projectId + "/variables/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables: parsed }),
      });
      const result = await response.json();
      if (!response.ok) {
        setImportMessage(typeof result?.error === "string" ? result.error : "Unable to import variables.");
        return;
      }
      const refreshed = await fetch("/api/projects/" + projectId + "/variables", { cache: "no-store" });
      if (refreshed.ok) setVariables(await refreshed.json());
      const skippedDetails = result.skippedKeys?.length ? " Skipped keys: " + result.skippedKeys.join(", ") + "." : "";
      const invalidDetails = invalidLines.length ? " Ignored malformed or duplicate lines: " + invalidLines.join(", ") + "." : "";
      setImportMessage("Imported " + result.imported + " variable(s); skipped " + result.skipped + "." + skippedDetails + invalidDetails);
      setImportText("");
    } catch {
      setImportMessage("Unable to import variables. Please try again.");
    } finally {
      setImportPending(false);
    }
  }

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

  async function saveProjectDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setProjectSavePending(true);
    try {
      const response = await fetch("/api/projects/" + projectId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, description: projectDescription, websiteUrl }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setError(responseError(result, "Unable to update project details."));
        return;
      }
      const updated = result as Project;
      setProject(updated);
      setProjectName(updated.name);
      setProjectDescription(updated.description);
      setWebsiteUrl(updated.websiteUrl ?? "");
      setShowProjectEditor(false);
      router.refresh();
    } catch {
      setError("Unable to update project details. Please try again.");
    } finally {
      setProjectSavePending(false);
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
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                  {project.logoUrl ? <img alt="" className="size-8 object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} src={project.logoUrl} /> : <span className="text-lg font-semibold text-zinc-400">{project.name.slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
                    <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
                      {variables.length} {variables.length === 1 ? "variable" : "variables"}
                    </span>
                  </div>
                  {project.description && <p className="mt-2 text-sm text-zinc-400">{project.description}</p>}
                  {project.websiteUrl && <a className="mt-2 inline-block max-w-full truncate text-sm text-zinc-400 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-100" href={project.websiteUrl} target="_blank" rel="noopener noreferrer">{project.websiteUrl} ↗</a>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900" onClick={() => setShowProjectEditor((shown) => !shown)} type="button">{showProjectEditor ? "Cancel edit" : "Edit details"}</button>
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

          {showProjectEditor && (
            <form onSubmit={saveProjectDetails} className="mt-6 max-w-2xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
              <div>
                <h2 className="font-semibold text-zinc-100">Edit project details</h2>
                <p className="mt-1 text-sm text-zinc-500">Add a website link to open your app quickly. Its favicon will be used as the project logo.</p>
              </div>
              <label className="block text-sm text-zinc-300">Project name
                <input className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-zinc-100 outline-none focus:border-zinc-600" onChange={(event) => setProjectName(event.target.value)} required maxLength={100} value={projectName} />
              </label>
              <label className="block text-sm text-zinc-300">Description
                <textarea className="mt-2 min-h-24 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-zinc-100 outline-none focus:border-zinc-600" onChange={(event) => setProjectDescription(event.target.value)} maxLength={1000} value={projectDescription} />
              </label>
              <label className="block text-sm text-zinc-300">Website URL <span className="text-zinc-500">(optional)</span>
                <input className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-zinc-100 outline-none focus:border-zinc-600" onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://your-app.vercel.app" type="url" value={websiteUrl} />
              </label>
              {websiteUrl.trim() && <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"><img alt="" className="size-8 rounded-md object-contain" src={"https://www.google.com/s2/favicons?domain_url=" + encodeURIComponent(websiteUrl.trim()) + "&sz=128"} /><span className="text-sm text-zinc-400">Favicon preview</span></div>}
              {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
              <button className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-300 disabled:opacity-60" disabled={projectSavePending} type="submit">{projectSavePending ? "Saving…" : "Save details"}</button>
            </form>
          )}

          <section className="mt-12">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Configuration</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Environment variables</h2>
              </div>
              <span className="text-sm text-zinc-500">{variables.length} total</span>
            </div>

            {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}

            <div className="mt-5 inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1" role="group" aria-label="Variable entry mode">
              <button className={entryMode === "single" ? "rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 shadow-sm" : "rounded-lg px-4 py-2 text-sm text-zinc-500 transition hover:text-zinc-200"} onClick={() => setEntryMode("single")} type="button" aria-pressed={entryMode === "single"}>Single variable</button>
              <button className={entryMode === "bulk" ? "rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 shadow-sm" : "rounded-lg px-4 py-2 text-sm text-zinc-500 transition hover:text-zinc-200"} onClick={() => setEntryMode("bulk")} type="button" aria-pressed={entryMode === "bulk"}>Bulk upload</button>
            </div>

            {entryMode === "bulk" && (
            <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Import a complete .env file</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Choose a .env/.env.local file or paste its contents. Existing keys are kept; duplicates are skipped.</p>
                </div>
                <button className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800" onClick={() => fileInputRef.current?.click()} type="button">Choose file</button>
                <input ref={fileInputRef} accept=".env,.txt,.local,text/plain" className="hidden" onChange={(event) => void readEnvFile(event)} type="file" />
              </div>
              <textarea aria-label="Environment file contents" className="mt-4 min-h-36 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3 font-mono text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600" onChange={(event) => { setImportText(event.target.value); setImportMessage(""); }} placeholder={"DATABASE_URL=mongodb://...\nAPI_KEY=your-secret\n# comments and blank lines are ignored"} value={importText} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-zinc-500">{parseEnvText(importText).parsed.length} valid variable(s) detected · max 500 per import</p>
                <button className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-wait disabled:opacity-60" disabled={importPending || !importText.trim()} onClick={() => void importVariables()} type="button">{importPending ? "Importing…" : "Import variables"}</button>
              </div>
              {importMessage && <p aria-live="polite" className="mt-3 break-words text-sm text-zinc-300">{importMessage}</p>}
            </section>

            )}

            {entryMode === "single" && (
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
            )}



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
