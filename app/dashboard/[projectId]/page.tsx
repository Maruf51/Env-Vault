import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ProjectDetails } from "@/components/ProjectDetails";
import { getCurrentUser, getOwnedProject } from "@/lib/auth-helpers";
import { decrypt, type EncryptedValue } from "@/lib/encryption";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  const userId = await getCurrentUser();
  if (!userId) return { title: "Project" };

  const project = await getOwnedProject(userId, projectId);
  return { title: project?.name ?? "Project" };
}

type VariableDocument = EncryptedValue & {
  projectId: ObjectId;
  key: string;
  createdAt: Date;
  updatedAt: Date;
};

export default function ProjectPage({
  params,
}: PageProps<"/dashboard/[projectId]">) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950" />}>
      {params.then(({ projectId }) => <ProjectContent projectId={projectId} />)}
    </Suspense>
  );
}

async function ProjectContent({ projectId }: { projectId: string }) {
  const userId = await getCurrentUser();
  if (!userId) redirect("/login");
  if (!/^[a-f\d]{24}$/i.test(projectId)) notFound();

  const project = await getOwnedProject(userId, projectId);
  if (!project) notFound();

  const database = await getDatabase();
  const variables = await database
    .collection<VariableDocument>("variables")
    .find({ projectId: new ObjectId(projectId) })
    .toArray();

  return (
    <ProjectDetails
      projectId={projectId}
      initialProject={{
        id: project._id.toHexString(),
        name: project.name,
        description: project.description,
      }}
      initialVariables={variables.map(({ _id, key, ...encrypted }) => ({
        id: _id.toHexString(),
        key,
        value: decrypt(encrypted),
      }))}
    />
  );
}
