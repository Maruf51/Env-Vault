# Env Vault

Env Vault is a self-hosted environment-variable manager built with the Next.js
App Router, Auth.js (NextAuth v5), and MongoDB. Values are encrypted at rest
with AES-256-GCM; the encryption key is kept only in your local environment,
never in MongoDB.

## Requirements

- Node.js 20 or newer
- A MongoDB Atlas cluster (or another MongoDB deployment)
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment setup

Create or update `.env.local` at the project root:

```dotenv
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=env-vault
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_KEY=<generated-key>
```

Generate the two secrets with OpenSSL:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

Use the first output for `ENCRYPTION_KEY` (exactly 64 hexadecimal characters)
and the second output for `NEXTAUTH_SECRET`. Do not commit `.env.local` or
share these values. `.env*` files are ignored by git.

**Back up `ENCRYPTION_KEY` somewhere safe, such as a password manager.** Every
stored value depends on that key and cannot be recovered if it is lost or
changed.

## MongoDB Atlas

1. Create an account at [MongoDB Atlas](https://www.mongodb.com/atlas) and
   create a project and a free or paid cluster.
2. Under **Database Access**, create a database user with a strong password.
   Give it the minimum database read/write permissions required for your
   cluster.
3. Under **Network Access**, allow the IP address of the machine running Env
   Vault. Avoid `0.0.0.0/0` for a publicly reachable production deployment.
4. Select **Connect → Drivers**, choose Node.js, and copy the connection string.
   Replace the username, password, and cluster placeholders. URL-encode any
   special characters in the username or password.
5. Set that URI as `MONGODB_URI` in `.env.local` and set `MONGODB_DB` to
   `env-vault`.
6. Restart the development server after changing `.env.local`.

The application creates the `users`, `projects`, and `variables` collections
as they are first used. It creates unique indexes for account emails and
variable keys within a project.

## Authentication and data protection

- Registration hashes passwords with bcryptjs (12 rounds).
- Auth.js Credentials sessions use signed JWTs.
- Each variable is encrypted using AES-256-GCM with a fresh random 12-byte IV;
  the ciphertext, IV, and authentication tag are stored as hex.
- Project and variable APIs verify that the signed-in user owns the project.
- Downloaded `.env.local` files are sorted alphabetically by key.

Next.js 16 renamed its `middleware.ts` convention to `proxy.ts`. This project
uses `proxy.ts` for the requested dashboard and project-API login gate, while
each API handler independently performs authentication and ownership checks.
