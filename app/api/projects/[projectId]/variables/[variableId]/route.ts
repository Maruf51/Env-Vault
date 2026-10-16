import { MongoServerError, ObjectId } from "mongodb";
import {
  getCurrentUser,
  getOwnedProject,
  invalidIdResponse,
  readJsonObject,
  unauthorizedResponse,
} from "@/lib/auth-helpers";
import { encrypt, type EncryptedValue } from "@/lib/encryption";
import { getDatabase } from "@/lib/mongodb";

type VariableDocument = EncryptedValue & {
  projectId: ObjectId;
  key: string;
  createdAt: Date;
  updatedAt: Date;
};
type RouteContext = { params: Promise<{ projectId: string; variableId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();
  const { projectId, variableId } = await params;
  if (!/^[a-f\d]{24}$/i.test(projectId) || !/^[a-f\d]{24}$/i.test(variableId)) {
    return invalidIdResponse();
  }

  const project = await getOwnedProject(userId, projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const body = await readJsonObject(request);
  if (!body || (!("key" in body) && !("value" in body))) {
    return Response.json({ error: "Provide a key or value to update." }, { status: 400 });
  }
  const key =
    "key" in body
      ? typeof body.key === "string"
        ? body.key.trim()
        : ""
      : undefined;
  if (key !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return Response.json({ error: "Use a valid environment variable name." }, { status: 400 });
  }
  if ("value" in body && typeof body.value !== "string") {
    return Response.json({ error: "Variable value must be a string." }, { status: 400 });
  }

  const database = await getDatabase();
  const variables = database.collection<VariableDocument>("variables");
  const objectProjectId = new ObjectId(projectId);
  const objectVariableId = new ObjectId(variableId);
  const existing = await variables.findOne({
    _id: objectVariableId,
    projectId: objectProjectId,
  });
  if (!existing) return Response.json({ error: "Variable not found." }, { status: 404 });

  const updates: Partial<VariableDocument> = { updatedAt: new Date() };
  if (key !== undefined) updates.key = key;
  if (typeof body.value === "string") Object.assign(updates, encrypt(body.value));

  await variables.createIndex({ projectId: 1, key: 1 }, { unique: true });
  try {
    await variables.updateOne(
      { _id: objectVariableId, projectId: objectProjectId },
      { $set: updates },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json({ error: `A variable named ${key ?? existing.key} already exists.` }, { status: 409 });
    }
    throw error;
  }

  return Response.json({
    id: variableId,
    key: updates.key ?? existing.key,
    value: typeof body.value === "string" ? body.value : undefined,
    updatedAt: updates.updatedAt,
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();
  const { projectId, variableId } = await params;
  if (!/^[a-f\d]{24}$/i.test(projectId) || !/^[a-f\d]{24}$/i.test(variableId)) {
    return invalidIdResponse();
  }

  const project = await getOwnedProject(userId, projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const database = await getDatabase();
  const result = await database.collection("variables").deleteOne({
    _id: new ObjectId(variableId),
    projectId: new ObjectId(projectId),
  });
  if (!result.deletedCount) {
    return Response.json({ error: "Variable not found." }, { status: 404 });
  }
  return Response.json({ success: true });
}
