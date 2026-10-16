import { ObjectId } from "mongodb";
import {
  getCurrentUser,
  getOwnedProject,
  invalidIdResponse,
  unauthorizedResponse,
} from "@/lib/auth-helpers";
import { decrypt, type EncryptedValue } from "@/lib/encryption";
import { getDatabase } from "@/lib/mongodb";

type VariableDocument = EncryptedValue & { projectId: ObjectId; key: string };
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
  const contents = variables
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map(({ key, ...encrypted }) => {
      const value = decrypt(encrypted);
      const formattedValue = /[\r\n]/.test(value)
        ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
        : value;
      return `${key}=${formattedValue}`;
    })
    .join("\n");

  return new Response(contents ? `${contents}\n` : "", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename=".env.local"',
      "Cache-Control": "no-store",
    },
  });
}
