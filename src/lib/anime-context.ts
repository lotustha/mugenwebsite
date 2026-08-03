/**
 * Live anime context for the AI autopilot.
 *
 * Without this, the generator writes from the model's training data — which has
 * a fixed cutoff. That makes "what's airing this season" posts confidently wrong
 * (a season that ended months ago, episode counts that never existed), and it's
 * the single largest source of hallucination in the pipeline.
 *
 * Everything here comes from the same upstream API the site already serves to
 * readers, so the AI is grounded in exactly the catalogue the app can play.
 */

const BASE = () => process.env.ANIME_API_BASE;

interface AnimeEntry {
  title?: string;
  japaneseTitle?: string;
  type?: string;
  year?: string;
  airingTime?: string;
  airingEpisode?: string;
}

export interface AnimeContext {
  spotlight: string[];
  airingToday: string[];
  recent: string[];
  /** Pre-formatted block for prompt injection; empty when the API is unreachable. */
  promptBlock: string;
}

async function fetchList(path: string): Promise<AnimeEntry[]> {
  const base = BASE();
  if (!base) return [];

  try {
    const res = await fetch(`${base}/${path}`, {
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "MugenAnime-Bot/1.0" },
    });
    if (!res.ok) return [];

    const d = (await res.json()) as { results?: AnimeEntry[] };
    return Array.isArray(d.results) ? d.results : [];
  } catch {
    return [];
  }
}

const clean = (list: AnimeEntry[], n: number) =>
  [...new Set(list.map((a) => a.title?.trim()).filter((t): t is string => !!t))].slice(0, n);

/**
 * Build the grounding block. Never throws and never blocks generation — if the
 * catalogue API is down the autopilot still writes, just without live context.
 */
export async function getAnimeContext(): Promise<AnimeContext> {
  const today = new Date().toISOString().slice(0, 10);

  const [spotlightRaw, scheduleRaw, recentRaw] = await Promise.all([
    fetchList("spotlight"),
    fetchList(`schedule/${today}`),
    fetchList("recent-added"),
  ]);

  const spotlight = clean(spotlightRaw, 9);
  const recent = clean(recentRaw, 15);

  // The schedule is the most valuable signal: real titles with real episode
  // numbers airing today. It's also the thing a model can never guess.
  const airingToday = scheduleRaw
    .filter((a) => a.title)
    .slice(0, 12)
    .map((a) => {
      const ep = a.airingEpisode ? ` — episode ${a.airingEpisode}` : "";
      const at = a.airingTime ? ` at ${a.airingTime}` : "";
      return `${a.title}${ep}${at}`;
    });

  const sections: string[] = [];
  if (spotlight.length) sections.push(`CURRENTLY FEATURED ON THE SITE:\n${spotlight.map((t) => `- ${t}`).join("\n")}`);
  if (airingToday.length) sections.push(`AIRING TODAY (${today}):\n${airingToday.map((t) => `- ${t}`).join("\n")}`);
  if (recent.length) sections.push(`RECENTLY ADDED TO THE CATALOGUE:\n${recent.map((t) => `- ${t}`).join("\n")}`);

  const promptBlock = sections.length
    ? [
        `TODAY'S DATE: ${today}`,
        "",
        "LIVE CATALOGUE DATA — this is real, current data from the Mugen Anime library.",
        "Your own knowledge of what is 'currently airing' is out of date; trust the",
        "lists below over your training data, and prefer writing about these titles.",
        "",
        sections.join("\n\n"),
      ].join("\n")
    : "";

  return { spotlight, airingToday, recent, promptBlock };
}
