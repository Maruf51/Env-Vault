import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ProjectDashboard } from "@/components/ProjectDashboard";
import {
  getCurrentUser,
  getProjectVariableCounts,
  type ProjectDocument,
} from "@/lib/auth-helpers";
import { getDatabase } from "@/lib/mongodb";

export const metadata: Metadata = {
  title: "Projects",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950" />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const userId = await getCurrentUser();
  if (!userId) redirect("/login");

  const database = await getDatabase();
  const projects = await database
    .collection<ProjectDocument>("projects")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
  const variableCounts = await getProjectVariableCounts(
    projects.map(({ _id }) => _id),
  );

  return (
    <ProjectDashboard
      initialProjects={projects.map(({ _id, name, description, websiteUrl, logoUrl, updatedAt }) => ({
        id: _id.toHexString(),
        name,
        description,
        websiteUrl: websiteUrl ?? "",
        logoUrl: logoUrl ?? "",
        updatedAt: updatedAt.toISOString(),
        variableCount: variableCounts.get(_id.toHexString()) ?? 0,
      }))}
    />
  );
}
