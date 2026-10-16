import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDatabase, getMongoClient } from "@/lib/mongodb";

type VaultUser = {
  _id: ObjectId;
  email: string;
  name?: string | null;
  passwordHash?: string;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(getMongoClient, {
    databaseName: process.env.MONGODB_DB ?? "env-vault",
  }),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const database = await getDatabase();
        const user = await database
          .collection<VaultUser>("users")
          .findOne({ email });

        if (!user?.passwordHash || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
          return null;
        }

        return {
          id: user._id.toHexString(),
          email: user.email,
          name: user.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
