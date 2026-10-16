import {
  getCurrentUser,
  getProjectVariableCounts,
  readJsonObject,
  unauthorizedResponse,
} from "@/lib/auth-helpers";
import { getDatabase } from "@/lib/mongodb";
import { discoverFavicon } from "@/lib/favicon";

export async function GET() {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();

  const database = await getDatabase();
  const projects = await database
    .collection("projects")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
  const variableCounts = await getProjectVariableCounts(
    projects.map(({ _id }) => _id),
  );

  return Response.json(
    projects.map(({ _id, name, description, websiteUrl, logoUrl, createdAt, updatedAt }) => ({
      id: _id.toHexString(),
      name,
      description,
      websiteUrl: websiteUrl ?? "",
      logoUrl: logoUrl ?? "",
      createdAt,
      updatedAt,
      variableCount: variableCounts.get(_id.toHexString()) ?? 0,
    })),
  );
}

export async function POST(request: Request) {
  const userId = await getCurrentUser();
  if (!userId) return unauthorizedResponse();

  const body = await readJsonObject(request);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const websiteUrl = typeof body?.websiteUrl === "string" ? body.websiteUrl.trim() : "";
  let normalizedWebsiteUrl = "";
  if (websiteUrl) {
    try {
      const parsed = new URL(websiteUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
      normalizedWebsiteUrl = parsed.toString();
    } catch {
      return Response.json({ error: "Enter a valid website URL starting with http:// or https://." }, { status: 400 });
    }
  }
  const logoUrl = normalizedWebsiteUrl ? await discoverFavicon(normalizedWebsiteUrl) : "";

  if (!name || name.length > 100) {
    return Response.json({ error: "Project name is required (up to 100 characters)." }, { status: 400 });
  }
  if (description.length > 1000) {
    return Response.json({ error: "Description must be 1000 characters or fewer." }, { status: 400 });
  }

  const now = new Date();
  const database = await getDatabase();
  const result = await database.collection("projects").insertOne({
    userId,
    name,
    description,
    websiteUrl: normalizedWebsiteUrl,
    logoUrl,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json(
    {
      id: result.insertedId.toHexString(),
      name,
      description,
      websiteUrl: normalizedWebsiteUrl,
      logoUrl,
      createdAt: now,
      updatedAt: now,
      variableCount: 0,
    },
    { status: 201 },
  );
}
