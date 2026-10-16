import { MongoClient, type Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise = globalThis._mongoClientPromise;

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not configured.");

    clientPromise = new MongoClient(uri).connect();
    if (process.env.NODE_ENV !== "production") {
      globalThis._mongoClientPromise = clientPromise;
    }
  }

  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const databaseName = process.env.MONGODB_DB ?? "env-vault";
  return (await getMongoClient()).db(databaseName);
}
