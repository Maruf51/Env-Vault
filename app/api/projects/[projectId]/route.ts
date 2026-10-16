import { ObjectId } from "mongodb";
import {
  getCurrentUser,
  getOwnedProject,
  invalidIdResponse,
  readJsonObject,
  unauthorizedResponse,
} from "@/lib/auth-helpers";
import { getDatabase } from "@/lib/mongodb";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();
  const { projectId } = await params;
  if (!/^[a-f\d]{24}$/i.test(projectId)) return invalidIdResponse();

  const project = await getOwnedProject(userId, projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  return Response.json({
    id: project._id.toHexString(),
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();
  const { projectId } = await params;
  if (!/^[a-f\d]{24}$/i.test(projectId)) return invalidIdResponse();

  const project = await getOwnedProject(userId, projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const body = await readJsonObject(request);
  if (!body || (!("name" in body) && !("description" in body))) {
    return Response.json({ error: "Provide a project name or description to update." }, { status: 400 });
  }

  const updates: { name?: string; description?: string; updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
      return Response.json({ error: "Project name is required (up to 100 characters)." }, { status: 400 });
    }
    updates.name = body.name.trim();
  }
  if ("description" in body) {
    if (typeof body.description !== "string" || body.description.trim().length > 1000) {
      return Response.json({ error: "Description must be 1000 characters or fewer." }, { status: 400 });
    }
    updates.description = body.description.trim();
  }

  const database = await getDatabase();
  await database.collection("projects").updateOne(
    { _id: new ObjectId(projectId), userId },
    { $set: updates },
  );
  return Response.json({
    id: projectId,
    name: updates.name ?? project.name,
    description: updates.description ?? project.description,
    createdAt: project.createdAt,
    updatedAt: updates.updatedAt,
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();
  const { projectId } = await params;
  if (!/^[a-f\d]{24}$/i.test(projectId)) return invalidIdResponse();

  const project = await getOwnedProject(userId, projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const database = await getDatabase();
  await database.collection("variables").deleteMany({ projectId: new ObjectId(projectId) });
  await database.collection("projects").deleteOne({
    _id: new ObjectId(projectId),
    userId,
  });

  return Response.json({ success: true });
}
