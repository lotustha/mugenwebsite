/**
 * Engagement scoring — decides which kinds of posts the autopilot writes more of.
 *
 * The whole feedback loop lives or dies on how this window is measured, so the
 * rules are deliberate:
 *
 *  1. Score views collected in a FIXED WINDOW since each post was published, not
 *     lifetime views. Lifetime views structurally favour older posts, which have
 *     simply had longer to accumulate — a topic tried once in January would beat
 *     a better topic tried last week, forever.
 *
 *  2. Only count posts whose window has fully elapsed. A post published this
 *     morning has near-zero views because it's new, not because it's bad;
 *     including it would drag its topic's average down and the bandit would
 *     abandon whatever it just tried.
 *
 *  3. Only score `source = "autopilot"` posts. RSS imports and hand-written
 *     posts have completely different baselines and would swamp the signal.
 *
 *  4. Topics below MIN_SAMPLES are treated as average rather than good or bad.
 *     At one post per day, a single unlucky post is noise, not evidence.
 */

import { prisma } from "@/lib/prisma";

/** Days after publication over which a post's views are counted. */
export const SCORING_WINDOW_DAYS = 7;

/** Below this many completed posts, a topic's own average isn't trusted yet. */
export const MIN_SAMPLES = 3;

/**
 * Share of picks reserved for uniform-random exploration.
 *
 * Without this the bandit locks onto whichever topic happened to win early and
 * never revisits the rest — and reader taste shifts every season.
 */
export const EXPLORATION_RATE = 0.25;

/**
 * How much a completed read outweighs a bounce.
 *
 * Scoring on raw views optimises for the HEADLINE, not the article — a title
 * that everyone clicks and nobody finishes scores identically to one people
 * actually read. Left alone, that pressure drifts the generator toward clickbait
 * over months, so the loop would degrade quality while appearing to work.
 *
 * engagement = views + READ_BONUS × completed reads
 *
 * Reads are a subset of views, so a fully-read post scores 4× a fully-bounced
 * one. When no reads have been recorded yet (e.g. before the tracking rolled
 * out) every topic scales identically and the ranking degrades gracefully to
 * plain views rather than breaking.
 */
export const READ_BONUS = 3;

export interface TopicScore {
  topicId: string;
  name: string;
  postsScored: number;
  avgViews: number;
  avgReads: number;
  /** Share of viewers who read the article through — the quality signal. */
  readRate: number;
  weight: number;
}

/**
 * Recompute per-topic average views and selection weights.
 * Persists the results onto AiTopic so the admin UI can explain the ranking.
 */
export async function scoreTopics(): Promise<TopicScore[]> {
  const topics = await prisma.aiTopic.findMany({ where: { isActive: true } });
  if (!topics.length) return [];

  const windowMs = SCORING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const matureBefore = new Date(Date.now() - windowMs);

  // Posts whose scoring window has fully elapsed.
  const posts = await prisma.post.findMany({
    where: {
      source: "autopilot",
      published: true,
      topicId: { not: null },
      publishedAt: { not: null, lte: matureBefore },
    },
    select: { id: true, topicId: true, publishedAt: true },
  });

  // Count only the engagement that landed inside each post's own window, so a
  // post that keeps drawing traffic for months isn't credited more than a fair
  // comparison allows.
  interface Sample { views: number; reads: number; engagement: number }
  const raw = new Map<string, Sample[]>();

  for (const post of posts) {
    const start = post.publishedAt!;
    const end = new Date(start.getTime() + windowMs);
    const where = { postId: post.id, createdAt: { gte: start, lte: end } };

    const [views, reads] = await Promise.all([
      prisma.postView.count({ where }),
      prisma.postView.count({ where: { ...where, completed: true } }),
    ]);

    const bucket = raw.get(post.topicId!) ?? [];
    bucket.push({ views, reads, engagement: views + READ_BONUS * reads });
    raw.set(post.topicId!, bucket);
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  // Global mean across scored topics — the stand-in value for topics that don't
  // have enough data yet, so they're neither promoted nor punished.
  const allScored = [...raw.values()].filter((v) => v.length >= MIN_SAMPLES).flat();
  const globalMean = mean(allScored.map((s) => s.engagement));

  const scores: TopicScore[] = topics.map((t) => {
    const samples = raw.get(t.id) ?? [];
    const avgViews = mean(samples.map((s) => s.views));
    const avgReads = mean(samples.map((s) => s.reads));
    const avgEngagement = mean(samples.map((s) => s.engagement));
    const trusted = samples.length >= MIN_SAMPLES;

    // Relative performance vs the site average, clamped so one runaway hit can't
    // collapse the distribution onto a single topic.
    const relative = trusted && globalMean > 0 ? avgEngagement / globalMean : 1;
    const weight = Math.max(0.15, Math.min(3, relative)) * (t.boost ?? 1);

    return {
      topicId: t.id,
      name: t.name,
      postsScored: samples.length,
      avgViews: Number(avgViews.toFixed(2)),
      avgReads: Number(avgReads.toFixed(2)),
      readRate: avgViews > 0 ? Number((avgReads / avgViews).toFixed(3)) : 0,
      weight: Number(weight.toFixed(3)),
    };
  });

  await Promise.all(
    scores.map((s) =>
      prisma.aiTopic.update({
        where: { id: s.topicId },
        data: {
          postsScored: s.postsScored,
          avgViews: s.avgViews,
          avgReads: s.avgReads,
          readRate: s.readRate,
          weight: s.weight,
        },
      }),
    ),
  );

  return scores;
}

/**
 * Pick the next topic: mostly weighted by measured engagement, sometimes uniform
 * at random so under-tried topics keep getting a chance.
 */
export function pickTopic(scores: TopicScore[]): TopicScore | null {
  if (!scores.length) return null;

  if (Math.random() < EXPLORATION_RATE) {
    return scores[Math.floor(Math.random() * scores.length)];
  }

  const total = scores.reduce((sum, s) => sum + s.weight, 0);
  if (total <= 0) return scores[Math.floor(Math.random() * scores.length)];

  let r = Math.random() * total;
  for (const s of scores) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return scores[scores.length - 1];
}
