import { ObjectId, type WithId } from "mongodb";
import { auth } from "@/auth";
import { getDatabase } from "@/lib/mongodb";

export type ProjectDocument = {
  userId: ObjectId;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getCurrentUser(): Promise<ObjectId | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !/^[a-f\d]{24}$/i.test(userId)) return null;
  return new ObjectId(userId);
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "Authentication required." }, { status: 401 });
}

export function invalidIdResponse(): Response {
  return Response.json({ error: "Invalid resource ID." }, { status: 400 });
}

export async function getOwnedProject(
  userId: ObjectId,
  projectId: string,
): Promise<WithId<ProjectDocument> | null> {
  if (!/^[a-f\d]{24}$/i.test(projectId)) return null;

  const database = await getDatabase();
  return database.collection<ProjectDocument>("projects").findOne({
    _id: new ObjectId(projectId),
    userId,
  });
}

export async function getProjectVariableCounts(
  projectIds: ObjectId[],
): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map();

  const database = await getDatabase();
  const counts = await database
    .collection("variables")
    .aggregate<{ _id: ObjectId; count: number }>([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: "$projectId", count: { $sum: 1 } } },
    ])
    .toArray();

  return new Map(counts.map(({ _id, count }) => [_id.toHexString(), count]));
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  return body as Record<string, unknown>;
}
