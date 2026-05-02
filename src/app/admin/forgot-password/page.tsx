"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center glass-dark rounded-2xl border border-outline-variant/15 p-8">
          <h2 className="font-headline text-2xl font-bold text-text-main mb-2">Email sent</h2>
          <p className="font-body text-text-main/60 mb-6">Check <span className="text-primary">{email}</span> for a reset link.</p>
          <Link href="/admin/login" className="font-body text-primary hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl font-bold text-text-main">Reset Password</h1>
          <p className="font-body text-text-main/50 mt-2">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-dark rounded-2xl border border-outline-variant/15 p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="font-body text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="font-body text-text-main/70 text-sm mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="w-full px-4 py-3 bg-surface border border-outline-variant/15 rounded-lg font-body text-text-main focus:outline-none focus:border-primary/50 transition-colors" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-dim disabled:opacity-50 font-headline font-semibold text-background rounded-lg transition-colors">
            {loading ? "Sending…" : "Send Reset Link"}
          </button>

          <p className="text-center">
            <Link href="/admin/login" className="font-body text-text-main/50 hover:text-primary text-sm transition-colors">
              Back to login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
