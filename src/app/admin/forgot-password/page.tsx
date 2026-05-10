import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center glass-dark rounded-2xl border border-outline-variant/15 p-8">
        <h2 className="font-headline text-2xl font-bold text-text-main mb-2">Password Reset</h2>
        <p className="font-body text-text-main/60 mb-6">
          Self-service password reset isn&apos;t configured yet. Run{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface text-primary text-xs">npm run create-admin</code>{" "}
          on the server to set a new admin password.
        </p>
        <Link href="/admin/login" className="font-body text-primary hover:underline">Back to login</Link>
      </div>
    </div>
  );
}
