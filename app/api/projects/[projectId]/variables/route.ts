import { MongoServerError, ObjectId } from "mongodb";
import {
  getCurrentUser,
  getOwnedProject,
  invalidIdResponse,
  readJsonObject,
  unauthorizedResponse,
} from "@/lib/auth-helpers";
import { decrypt, encrypt, type EncryptedValue } from "@/lib/encryption";
import { getDatabase } from "@/lib/mongodb";

type VariableDocument = EncryptedValue & {
  projectId: ObjectId;
  key: string;
  createdAt: Date;
  updatedAt: Date;
};
type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();
  const { projectId } = await params;
  if (!/^[a-f\d]{24}$/i.test(projectId)) return invalidIdResponse();

  const project = await getOwnedProject(userId, projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const database = await getDatabase();
  const variables = await database
    .collection<VariableDocument>("variables")
    .find({ projectId: new ObjectId(projectId) })
    .toArray();

  return Response.json(
    variables.map(({ _id, key, createdAt, updatedAt, ...encrypted }) => ({
      id: _id.toHexString(),
      key,
      value: decrypt(encrypted),
      createdAt,
      updatedAt,
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();
  const { projectId } = await params;
  if (!/^[a-f\d]{24}$/i.test(projectId)) return invalidIdResponse();

  const project = await getOwnedProject(userId, projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const body = await readJsonObject(request);
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  const value = typeof body?.value === "string" ? body.value : null;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return Response.json({ error: "Use a valid environment variable name." }, { status: 400 });
  }
  if (value === null) {
    return Response.json({ error: "Variable value must be a string." }, { status: 400 });
  }

  const database = await getDatabase();
  const variables = database.collection<VariableDocument>("variables");
  await variables.createIndex({ projectId: 1, key: 1 }, { unique: true });
  const now = new Date();
  try {
    const result = await variables.insertOne({
      projectId: new ObjectId(projectId),
      key,
      ...encrypt(value),
      createdAt: now,
      updatedAt: now,
    });
    return Response.json({ id: result.insertedId.toHexString(), key, value, createdAt: now, updatedAt: now }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json({ error: `A variable named ${key} already exists.` }, { status: 409 });
    }
    throw error;
  }
}
