import admin from "firebase-admin";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Firebase Admin singleton.
 *
 * Credential resolution order (first that works wins):
 *   1. Service-account JSON file — path from FIREBASE_SERVICE_ACCOUNT_PATH,
 *      else `firebase-admin.json` at the project root (process.cwd()).
 *   2. Discrete env vars FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
 *
 * The JSON file is preferred because it sidesteps the `\n`-escaping pitfalls of
 * putting a PEM private key in an env var, and matches the regenerated
 * service-account the project ships with.
 *
 * If nothing resolves, `admin.apps` stays empty and every send helper returns
 * `{ success: false, error: "Firebase not configured" }` instead of throwing.
 */

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function loadServiceAccount(): admin.ServiceAccount | null {
  // 1) JSON service-account file
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    join(process.cwd(), "firebase-admin.json"),
  ].filter(Boolean) as string[];

  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue;
      const json = JSON.parse(readFileSync(path, "utf8")) as ServiceAccountJson;
      if (json.project_id && json.client_email && json.private_key) {
        return {
          projectId: json.project_id,
          clientEmail: json.client_email,
          privateKey: json.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch (e) {
      console.error(`[firebase-admin] Failed to read service account at ${path}:`, e instanceof Error ? e.message : e);
    }
  }

  // 2) Discrete env vars
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    };
  }

  return null;
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log(`[firebase-admin] Initialised for project ${serviceAccount.projectId}`);
  } else {
    console.warn("[firebase-admin] No credentials found — push notifications disabled");
  }
}

export default admin;
