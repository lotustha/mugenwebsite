// Runs once when the Next.js Node.js server starts (natively supported in Next.js 14+).
// No extra config needed. Perfect for background schedulers on VPS / self-hosted deployments.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronScheduler } = await import("@/lib/cron-scheduler");
    startCronScheduler();
  }
}
