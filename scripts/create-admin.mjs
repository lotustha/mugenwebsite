// Bootstrap an admin account directly in Postgres.
//
// Usage:
//   npm run create-admin -- you@example.com 'YourStrongPassword'
//
// Reads DATABASE_URL from .env.local, then .env. Inserts into public.users
// with role=ADMIN and a bcrypt-hashed password. If the email already exists,
// the password is reset and role bumped to ADMIN.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(file) {
  try {
    const raw = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const [, k, vRaw] = m;
      if (process.env[k]) continue;
      let v = vRaw.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  } catch {
    /* file may not exist */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set in .env or .env.local");
  process.exit(1);
}

const [emailArg, passwordArg] = process.argv.slice(2);

if (!emailArg || !passwordArg) {
  console.error("Usage: npm run create-admin -- <email> <password>");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg;

if (!email.includes("@")) {
  console.error("Invalid email.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const { default: bcrypt } = await import("bcryptjs");
const { default: pg } = await import("pg");

const hash = await bcrypt.hash(password, 12);

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

try {
  const sql = `
    INSERT INTO public.users (email, password, role, created_at)
    VALUES ($1, $2, 'ADMIN', NOW())
    ON CONFLICT (email)
    DO UPDATE SET password = EXCLUDED.password, role = 'ADMIN'
    RETURNING id, email, role
  `;
  const { rows } = await client.query(sql, [email, hash]);
  const row = rows[0];
  console.log(`Admin ready: ${row.email} (id ${row.id})`);
} catch (e) {
  console.error("Failed to create admin:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
