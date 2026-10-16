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
type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();

  const { projectId } = await params;
  if (!/^[a-f\d]{24}$/i.test(projectId)) return invalidIdResponse();

  const project = await getOwnedProject(userId, projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const body = await readJsonObject(request);
  if (!Array.isArray(body?.variables) || body.variables.length === 0) {
    return Response.json({ error: "Provide at least one parsed environment variable." }, { status: 400 });
  }
  if (body.variables.length > 500) {
    return Response.json({ error: "Import is limited to 500 variables at a time." }, { status: 400 });
  }

  const input: { key: string; value: string }[] = [];
  const invalidKeys: string[] = [];
  const seen = new Set<string>();
  for (const item of body.variables) {
    if (!item || typeof item !== "object" || typeof item.key !== "string" || typeof item.value !== "string") {
      invalidKeys.push("Unknown entry");
      continue;
    }
    const key = item.key.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      invalidKeys.push(key || "Empty key");
      continue;
    }
    if (seen.has(key)) {
      invalidKeys.push(key);
      continue;
    }
    seen.add(key);
    input.push({ key, value: item.value });
  }

  const database = await getDatabase();
  const collection = database.collection<VariableDocument>("variables");
  await collection.createIndex({ projectId: 1, key: 1 }, { unique: true });
  const existing = await collection.find(
    { projectId: new ObjectId(projectId), key: { $in: input.map((item) => item.key) } },
    { projection: { key: 1 } },
  ).toArray();
  const existingKeys = new Set(existing.map((item) => item.key));
  const skippedKeys = [...invalidKeys, ...existingKeys];
  const now = new Date();
  let imported = 0;

  for (const item of input) {
    if (existingKeys.has(item.key)) continue;
    try {
      await collection.insertOne({
        projectId: new ObjectId(projectId),
        key: item.key,
        ...encrypt(item.value),
        createdAt: now,
        updatedAt: now,
      });
      imported += 1;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        skippedKeys.push(item.key);
        continue;
      }
      throw error;
    }
  }

  return Response.json({ imported, skipped: skippedKeys.length, skippedKeys });
}
