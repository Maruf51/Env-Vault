# EnvVault

EnvVault is a self-hosted environment-variable manager for keeping each project's configuration in one place. It provides authenticated project lists, encrypted secret storage, individual variable management, bulk .env import, and downloadable environment files.

## Features

- **Projects** — create and manage separate collections of environment variables.
- **Bulk .env import** — upload a complete .env, .env.local, or compatible text file, or paste the file contents.
- **Import preview** — see how many valid variables are detected before importing.
- **Duplicate protection** — existing keys are preserved; duplicates and invalid entries are skipped and reported.
- **Variable management** — add, edit, and delete individual variables.
- **Export** — download a project's variables as a sorted .env.local file.
- **Authentication** — account registration and login using Auth.js Credentials.
- **Encryption at rest** — values are encrypted using AES-256-GCM before being stored in MongoDB.
- **Project ownership checks** — API endpoints verify that the signed-in user owns the project.

## Tech stack

- Next.js 16 App Router and React 19
- TypeScript
- Auth.js / NextAuth v5
- MongoDB and the MongoDB Node.js driver
- Tailwind CSS v4
- Node.js crypto (AES-256-GCM)
- bcryptjs for password hashing

## Requirements

- Node.js 20+
- npm
- A MongoDB Atlas cluster or another reachable MongoDB deployment

## Getting started

1. Clone the repository and enter the project directory:

   ~~~bash
   git clone https://github.com/Maruf51/Env-Vault.git
   cd Env-Vault
   ~~~

2. Install dependencies:

   ~~~bash
   npm install
   ~~~

3. Create .env.local in the project root:

   ~~~dotenv
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=env-vault
   NEXTAUTH_SECRET=<generated-secret>
   NEXTAUTH_URL=http://localhost:3000
   ENCRYPTION_KEY=<64-character-hex-key>
   ~~~

4. Generate strong secrets:

   ~~~bash
   # 64 hexadecimal characters for ENCRYPTION_KEY
   openssl rand -hex 32

   # A secret for NEXTAUTH_SECRET
   openssl rand -base64 32
   ~~~

   Copy each generated value into the matching variable. ENCRYPTION_KEY must be exactly 64 hexadecimal characters.

5. Start the development server:

   ~~~bash
   npm run dev
   ~~~

6. Open [http://localhost:3000](http://localhost:3000), register an account, and create a project.

Other available scripts:

~~~bash
npm run build
npm run start
npm run lint
~~~

## Importing a complete environment file

1. Open a project.
2. Under **Import a complete .env file**, choose a local environment file or paste its contents.
3. Review the detected variable count.
4. Select **Import variables**.
5. Review the import summary. Existing keys are not overwritten.

The import endpoint accepts up to 500 variables per request. The file picker rejects files larger than 1 MB. Blank lines, comments, and lines prefixed with **export** are supported. The parser splits each assignment at the first equals sign, so values may contain additional equals signs. Matching surrounding single or double quotes are removed. Invalid names and repeated keys within the same input are skipped.

This is a simple dotenv-style parser, not a complete shell interpreter: shell expansion, command substitution, and multiline quoted values are not evaluated.

## MongoDB setup

1. Create a cluster and database user in [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Grant the database user only the access it needs.
3. Configure Network Access for the environment where EnvVault runs. Avoid allowing every IP address for production unless you understand the risk.
4. Copy the Node.js driver connection string, replace its placeholders, and URL-encode special characters in credentials.
5. Set the connection string in MONGODB_URI and the database name in MONGODB_DB.

The application creates its collections and required indexes when they are first used.

## Security notes

- Never commit real .env files, database credentials, API keys, or generated secrets.
- Keep .env.local private. The repository's .gitignore excludes local environment files.
- Back up ENCRYPTION_KEY in a secure password manager. If the key is lost or changed, previously encrypted values cannot be decrypted.
- Values are encrypted on the server before being written to MongoDB; the encryption key is read from the server's environment and is not stored in the database.
- Use HTTPS in production and keep dependencies and the deployment runtime updated.
- Treat downloaded .env.local files as sensitive and do not upload them to public issue trackers or repositories.

## Project structure

~~~text
app/
  api/
    auth/                  # Auth.js and registration endpoints
    projects/              # Project and variable APIs
      [projectId]/
        download/           # Download project variables
        variables/
          import/           # Bulk .env import
  dashboard/               # Project list and project details routes
  login/
  register/
components/
  ProjectDashboard.tsx
  ProjectDetails.tsx
  LoginForm.tsx
  RegisterForm.tsx
lib/
  auth-helpers.ts
  encryption.ts
  mongodb.ts
auth.ts
proxy.ts
~~~

## License

No license file is currently included. Add a license before distributing or reusing the project under explicit open-source terms.
