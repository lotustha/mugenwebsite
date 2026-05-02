"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Ambient orbs ─── */
function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(186,158,255,0.18) 0%, rgba(186,158,255,0.04) 55%, transparent 75%)",
          animation: "orb-float 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(97,194,255,0.14) 0%, rgba(97,194,255,0.03) 55%, transparent 75%)",
          animation: "orb-float 10s ease-in-out infinite",
          animationDelay: "3s",
        }}
      />
    </div>
  );
}

/* ─── Eye icon ─── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

/* ─── Login Form ─── */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    const next = searchParams.get("next") ?? "/admin";
    router.push(next);
    router.refresh();
  };

  return (
    <motion.form
      onSubmit={handleLogin}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Outer glow ring */}
      <div
        className="absolute -inset-px rounded-2xl pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(186,158,255,0.22) 0%, rgba(97,194,255,0.12) 60%, rgba(186,158,255,0.08) 100%)",
        }}
      />

      {/* Glass card */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          backdropFilter: "blur(40px) saturate(200%) brightness(1.05)",
          WebkitBackdropFilter: "blur(40px) saturate(200%) brightness(1.05)",
          background: "linear-gradient(135deg, rgba(186,158,255,0.08) 0%, rgba(9,19,40,0.88) 45%, rgba(97,194,255,0.05) 100%)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 24px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(186,158,255,0.07) inset, 0 1px 0 rgba(255,255,255,0.1) inset",
        }}
      >
        {/* Top specular line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22) 40%, rgba(255,255,255,0.07) 70%, transparent)" }}
        />

        <div className="px-7 pt-7 pb-6 space-y-4">

          {/* Header — icon + text in a row to save height */}
          <div className="flex items-center gap-4 mb-1">
            <div
              className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(186,158,255,0.22) 0%, rgba(132,85,239,0.16) 100%)",
                border: "1px solid rgba(186,158,255,0.22)",
                boxShadow: "0 0 18px rgba(186,158,255,0.18), 0 4px 10px rgba(0,0,0,0.3)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" style={{ color: "#ba9eff" }}>
                <path d="M12 2C9.243 2 7 4.243 7 7v2H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-2V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v2H9V7c0-1.654 1.346-3 3-3zm0 9a2 2 0 110 4 2 2 0 010-4z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h2 className="font-headline text-xl font-bold text-text-main tracking-tight leading-tight">
                Welcome back
              </h2>
              <p className="font-body text-xs mt-0.5" style={{ color: "rgba(222,229,255,0.4)" }}>
                Sign in to your admin dashboard
              </p>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-body"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 shrink-0">
                    <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                  </svg>
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block font-body text-[11px] font-medium tracking-widest uppercase" style={{ color: "rgba(222,229,255,0.45)" }}>
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-300"
                style={{ boxShadow: focusedField === "email" ? "0 0 0 1.5px rgba(186,158,255,0.55), 0 0 14px rgba(186,158,255,0.1)" : "0 0 0 1px rgba(255,255,255,0.07)" }}
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                style={{ color: focusedField === "email" ? "#ba9eff" : "rgba(222,229,255,0.28)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                required
                autoComplete="email"
                placeholder="admin@mugen.app"
                className="w-full pl-10 pr-4 py-3 rounded-xl font-body text-sm text-text-main placeholder:text-text-main/20 focus:outline-none transition-all duration-300"
                style={{ background: "rgba(9,19,40,0.65)", backdropFilter: "blur(8px)" }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block font-body text-[11px] font-medium tracking-widest uppercase" style={{ color: "rgba(222,229,255,0.45)" }}>
                Password
              </label>
              <Link
                href="/admin/forgot-password"
                className="font-body text-[11px] transition-colors duration-200"
                style={{ color: "rgba(186,158,255,0.55)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ba9eff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(186,158,255,0.55)")}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-300"
                style={{ boxShadow: focusedField === "password" ? "0 0 0 1.5px rgba(186,158,255,0.55), 0 0 14px rgba(186,158,255,0.1)" : "0 0 0 1px rgba(255,255,255,0.07)" }}
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                style={{ color: focusedField === "password" ? "#ba9eff" : "rgba(222,229,255,0.28)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                required
                autoComplete="current-password"
                placeholder="••••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-xl font-body text-sm text-text-main placeholder:text-text-main/20 focus:outline-none transition-all duration-300"
                style={{ background: "rgba(9,19,40,0.65)", backdropFilter: "blur(8px)" }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg cursor-pointer transition-colors duration-200"
                style={{ color: "rgba(222,229,255,0.3)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.01 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative w-full py-3 rounded-xl font-headline font-semibold text-sm tracking-wide cursor-pointer overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            style={{
              background: loading ? "rgba(132,85,239,0.4)" : "linear-gradient(135deg, #ba9eff 0%, #8455ef 50%, #7c3aed 100%)",
              color: "#0f0820",
              boxShadow: loading ? "none" : "0 0 20px rgba(186,158,255,0.3), 0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            {!loading && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.16) 50%, transparent 70%)", animation: "shimmer 3s ease-in-out infinite" }}
              />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : "Sign In"}
            </span>
          </motion.button>

          {/* Footer */}
          <p className="text-center font-body text-xs" style={{ color: "rgba(222,229,255,0.35)" }}>
            No account?{" "}
            <Link
              href="/admin/signup"
              className="font-medium transition-colors duration-200"
              style={{ color: "rgba(186,158,255,0.75)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ba9eff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(186,158,255,0.75)")}
            >
              Create one
            </Link>
            <span className="mx-2" style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <Link
              href="/"
              className="transition-colors duration-200"
              style={{ color: "rgba(222,229,255,0.35)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(222,229,255,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(222,229,255,0.35)")}
            >
              Back to site
            </Link>
          </p>
        </div>

        {/* Bottom specular */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(97,194,255,0.13) 50%, transparent)" }}
        />
      </div>
    </motion.form>
  );
}

/* ─── Page ─── */
export default function AdminLoginPage() {
  return (
    <>
      <style>{`
        @keyframes orb-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          33% { transform: translateY(-18px) scale(1.04); }
          66% { transform: translateY(10px) scale(0.97); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          60%, 100% { transform: translateX(200%); }
        }
      `}</style>

      <AmbientOrbs />

      <div className="relative min-h-screen flex items-center justify-center px-4">
        <motion.div
          className="w-full max-w-[390px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Suspense
            fallback={
              <div
                className="rounded-2xl flex items-center justify-center h-80"
                style={{ backdropFilter: "blur(40px)", background: "rgba(9,19,40,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(186,158,255,0.2)", borderTopColor: "#ba9eff" }} />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </motion.div>
      </div>
    </>
  );
}
