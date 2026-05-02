"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function AdminSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center glass-dark rounded-2xl border border-outline-variant/15 p-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-headline text-2xl font-bold text-text-main mb-2">Check your email</h2>
          <p className="font-body text-text-main/60 mb-6">We sent a confirmation link to <span className="text-primary">{email}</span></p>
          <Link href="/admin/login" className="font-body text-primary hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl font-bold text-text-main">Create Account</h1>
          <p className="font-body text-text-main/50 mt-2">Admin access to Mugen dashboard</p>
        </div>

        <form onSubmit={handleSignup} className="glass-dark rounded-2xl border border-outline-variant/15 p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="font-body text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="font-body text-text-main/70 text-sm mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-3 bg-surface border border-outline-variant/15 rounded-lg font-body text-text-main focus:outline-none focus:border-primary/50 transition-colors" />
          </div>
          <div>
            <label className="font-body text-text-main/70 text-sm mb-1.5 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3 bg-surface border border-outline-variant/15 rounded-lg font-body text-text-main focus:outline-none focus:border-primary/50 transition-colors" />
          </div>
          <div>
            <label className="font-body text-text-main/70 text-sm mb-1.5 block">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              className="w-full px-4 py-3 bg-surface border border-outline-variant/15 rounded-lg font-body text-text-main focus:outline-none focus:border-primary/50 transition-colors" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-dim disabled:opacity-50 font-headline font-semibold text-background rounded-lg transition-colors">
            {loading ? "Creating…" : "Create Account"}
          </button>

          <p className="text-center">
            <Link href="/admin/login" className="font-body text-text-main/50 hover:text-primary text-sm transition-colors">
              Already have an account? Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
