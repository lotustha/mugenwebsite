import fs from "fs/promises";
import path from "path";

/**
 * Registry of markdown docs served at /docs/[slug].
 * Files are read from the repo root (or docs/) at render time — explicit
 * allowlist only, so there is no path traversal surface.
 */
export const DOCS: Record<
  string,
  { file: string; title: string; description: string }
> = {
  "flutter-api": {
    file: "FLUTTER_API.md",
    title: "Flutter API Reference",
    description:
      "REST API reference for the Flutter mobile apps — posts, wallpapers, apps, notifications.",
  },
  "in-app-messages": {
    file: "IN_APP_MESSAGES_FLUTTER.md",
    title: "In-App Messages",
    description:
      "The in-app messaging system: REST vs FCM delivery, per-app integration status, endpoints, Flutter integration and troubleshooting.",
  },
};

export async function readDoc(slug: string): Promise<string | null> {
  const entry = DOCS[slug];
  if (!entry) return null;
  try {
    return await fs.readFile(path.join(process.cwd(), entry.file), "utf-8");
  } catch {
    return null;
  }
}
