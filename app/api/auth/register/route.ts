import bcrypt from "bcryptjs";
import { MongoServerError } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { readJsonObject } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }
  if (name.length > 100) {
    return Response.json({ error: "Name must be 100 characters or fewer." }, { status: 400 });
  }

  if (!process.env.MONGODB_URI) {
    console.error("[auth/register] MONGODB_URI is missing in this deployment.");
    return Response.json(
      { error: "Registration is temporarily unavailable because the database is not configured." },
      { status: 503 },
    );
  }

  try {
    const database = await getDatabase();
    const users = database.collection("users");
    await users.createIndex({ email: 1 }, { unique: true });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await users.insertOne({
      email,
      name: name || null,
      passwordHash,
      createdAt: new Date(),
    });

    return Response.json(
      { user: { id: result.insertedId.toHexString(), email, name: name || null } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    // Log only the error class, never the request body, credentials, or database URI.
    console.error(
      "[auth/register] Registration failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return Response.json(
      { error: "Registration could not reach the database. Check the production MongoDB configuration and try again." },
      { status: 503 },
    );
  }
}
