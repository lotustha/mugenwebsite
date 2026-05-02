"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ORModel {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
}

type Provider = "openrouter" | "gemini" | "openai" | "claude";

interface ApiKeys {
  openrouter: string;
  gemini: string;
  openai: string;
  claude: string;
  openrouterModel: string;
  geminiModel: string;
  openaiModel: string;
  claudeModel: string;
}

const STORAGE_KEY = "mugen_ai_settings";

const PROVIDER_META: Record<
  Provider,
  {
    label: string;
    placeholder: string;
    color: string;
    icon: React.ReactNode;
    hint: string;
  }
> = {
  openrouter: {
    label: "OpenRouter",
    placeholder: "sk-or-v1-…",
    color: "#7c3aed",
    hint: "openrouter.ai — access 200+ models with one key",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  gemini: {
    label: "Google Gemini",
    placeholder: "AIzaSy…",
    color: "#0ea5e9",
    hint: "aistudio.google.com — Gemini 1.5 Flash / Pro",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
  },
  openai: {
    label: "OpenAI",
    placeholder: "sk-…",
    color: "#10b981",
    hint: "platform.openai.com — GPT-4o / GPT-4 Turbo",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4998-2.6067-1.4997Z" />
      </svg>
    ),
  },
  claude: {
    label: "Anthropic Claude",
    placeholder: "sk-ant-…",
    color: "#f59e0b",
    hint: "console.anthropic.com — Claude 3.5 Sonnet / Haiku",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.304 3.541 12.006 16.72 6.696 3.541H3l6.38 16.918h5.253L21 3.541h-3.696z" />
      </svg>
    ),
  },
};

// ─── Pill badge ───────────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
        active
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
          : "bg-white/5 text-white/25 border border-white/8"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`}
      />
      {active ? "Active" : "Not set"}
    </span>
  );
}

// ─── Key input card ───────────────────────────────────────────────────────────
function KeyCard({
  provider,
  value,
  onChange,
  extra,
}: {
  provider: Provider;
  value: string;
  onChange: (v: string) => void;
  extra?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const meta = PROVIDER_META[provider];

  return (
    <div
      className="rounded-2xl p-5 space-y-4 transition-all duration-300"
      style={{
        background: "rgba(9,19,40,0.55)",
        border: `1px solid ${value ? meta.color + "40" : "rgba(255,255,255,0.07)"}`,
        boxShadow: value ? `0 0 20px ${meta.color}18` : "none",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: meta.color + "20", color: meta.color }}
          >
            {meta.icon}
          </div>
          <div>
            <p className="font-headline text-sm font-semibold text-white/90">
              {meta.label}
            </p>
            <p className="font-body text-[11px] text-white/35 mt-0.5">
              {meta.hint}
            </p>
          </div>
        </div>
        <StatusBadge active={!!value} />
      </div>

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={meta.placeholder}
          className="w-full pr-10 pl-4 py-2.5 rounded-xl font-mono text-sm text-white/80 placeholder-white/20 outline-none transition-all"
          style={{
            background: "rgba(6,14,32,0.7)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = meta.color + "60";
            e.currentTarget.style.boxShadow = `0 0 0 3px ${meta.color}18`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
        >
          {show ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
              />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {extra}
    </div>
  );
}

// ─── OpenRouter model picker ──────────────────────────────────────────────────
function ModelPicker({
  apiKey,
  selected,
  onSelect,
}: {
  apiKey: string;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [models, setModels] = useState<ORModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const fetchModels = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/openrouter-models", {
        headers: { "x-openrouter-key": apiKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setModels(data.models ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch models");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (apiKey && open && models.length === 0) fetchModels();
  }, [open, apiKey, fetchModels, models.length]);

  const filtered = models.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedModel = models.find((m) => m.id === selected);

  if (!apiKey) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-white/50 font-medium">Model</p>
        {selected && (
          <span className="font-mono text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 truncate max-w-[200px]">
            {selectedModel?.name ?? selected}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-body text-sm text-white/70 hover:text-white transition-all"
        style={{
          background: "rgba(6,14,32,0.7)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span>
          {selected ? (selectedModel?.name ?? selected) : "Select a model…"}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: "1px solid rgba(124,58,237,0.2)",
            background: "rgba(6,14,32,0.95)",
          }}
        >
          {/* Search */}
          <div className="p-2 border-b border-white/5">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30"
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models…"
                className="w-full pl-8 pr-3 py-2 rounded-lg font-body text-xs text-white/70 placeholder-white/25 outline-none bg-white/5"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8 gap-2 text-white/40 text-xs">
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="31.4"
                    strokeDashoffset="10"
                  />
                </svg>
                Loading models…
              </div>
            )}
            {error && (
              <div className="px-4 py-3 text-xs text-red-400">{error}</div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-white/30">
                No models found
              </div>
            )}
            {!loading &&
              filtered.map((m) => {
                const promptCost =
                  parseFloat(m.pricing?.prompt ?? "0") * 1_000_000;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelect(m.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/4 last:border-0 ${
                      selected === m.id ? "bg-violet-500/10" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-body text-xs font-medium truncate ${selected === m.id ? "text-violet-300" : "text-white/75"}`}
                      >
                        {m.name}
                      </p>
                      <p className="font-mono text-[10px] text-white/30 truncate">
                        {m.id}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-[10px] text-white/35">
                        {promptCost > 0
                          ? `$${promptCost.toFixed(2)}/M`
                          : "free"}
                      </p>
                      {m.context_length && (
                        <p className="font-mono text-[10px] text-white/20">
                          {(m.context_length / 1000).toFixed(0)}k ctx
                        </p>
                      )}
                    </div>
                    {selected === m.id && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="w-4 h-4 text-violet-400 shrink-0 mt-0.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ad network key shape ─────────────────────────────────────────────────────
interface AdKeys {
  admob_refresh_token:   string;
  admob_account_id:      string;
  admob_connected_email: string;
  unity_org_id:  string;
  unity_api_key: string;
}

const emptyAdKeys = (): AdKeys => ({
  admob_refresh_token:   "",
  admob_account_id:      "",
  admob_connected_email: "",
  unity_org_id:  "",
  unity_api_key: "",
});

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeys>({
    openrouter: "",
    gemini: "",
    openai: "",
    claude: "",
    openrouterModel: "",
    geminiModel: "gemini-1.5-flash",
    openaiModel: "gpt-4o-mini",
    claudeModel: "claude-3-haiku-20240307",
  });
  const [saved, setSaved]           = useState(false);
  const [adKeys, setAdKeys]         = useState<AdKeys>(emptyAdKeys());
  const [adSaved, setAdSaved]       = useState(false);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  // Load from DB on mount
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setKeys({
            openrouter: data.openrouter || "",
            gemini: data.gemini || "",
            openai: data.openai || "",
            claude: data.claude || "",
            openrouterModel: data.openrouterModel || "",
            geminiModel: data.geminiModel || "gemini-1.5-flash",
            openaiModel: data.openaiModel || "gpt-4o-mini",
            claudeModel: data.claudeModel || "claude-3-haiku-20240307",
          });
          setAdKeys({
            admob_refresh_token:   data.admob_refresh_token   || "",
            admob_account_id:      data.admob_account_id      || "",
            admob_connected_email: data.admob_connected_email || "",
            unity_org_id:  data.unity_org_id  || "",
            unity_api_key: data.unity_api_key || data.unity_key_id || "", // migrate old key
          });
        }
      })
      .catch(console.error);
  }, []);

  // Determine active provider (priority order)
  useEffect(() => {
    if (keys.openrouter) setActiveProvider("openrouter");
    else if (keys.gemini) setActiveProvider("gemini");
    else if (keys.openai) setActiveProvider("openai");
    else if (keys.claude) setActiveProvider("claude");
    else setActiveProvider(null);
  }, [keys]);

  const handleSave = async () => {
    setSaved(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keys),
      });
    } catch (e) {
      console.error("Failed to save settings", e);
    }
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClear = (provider: Provider) => {
    const next = { ...keys, [provider]: "" };
    if (provider === "openrouter") next.openrouterModel = "";
    setKeys(next);
  };

  const setKey = (provider: keyof ApiKeys) => (v: string) =>
    setKeys((p) => ({ ...p, [provider]: v }));

  const hasAnyKey = Object.entries(keys)
    .filter(([k]) => k !== "openrouterModel")
    .some(([, v]) => !!v);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-headline text-2xl font-bold text-white/90">
          AI Settings
        </h1>
        <p className="font-body text-sm text-white/40 mt-1">
          Configure API keys for AI-powered post generation. Keys are stored
          securely in the database.
        </p>
      </div>

      {/* Active provider indicator */}
      <div
        className="flex items-center gap-4 p-4 rounded-2xl"
        style={{
          background: "rgba(9,19,40,0.55)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: activeProvider
              ? PROVIDER_META[activeProvider].color + "20"
              : "rgba(255,255,255,0.05)",
            color: activeProvider
              ? PROVIDER_META[activeProvider].color
              : "rgba(255,255,255,0.2)",
          }}
        >
          {activeProvider ? (
            PROVIDER_META[activeProvider].icon
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
              <circle cx="12" cy="12" r="10" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01"
              />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="font-body text-sm text-white/70">
            {activeProvider ? (
              <>
                AI powered by{" "}
                <span
                  style={{ color: PROVIDER_META[activeProvider].color }}
                  className="font-semibold"
                >
                  {PROVIDER_META[activeProvider].label}
                </span>
                {activeProvider === "openrouter" && keys.openrouterModel && (
                  <span className="ml-1 text-white/35">
                    · {keys.openrouterModel.split("/").pop()}
                  </span>
                )}
              </>
            ) : (
              <span className="text-white/35">
                No API key configured — AI features are disabled
              </span>
            )}
          </p>
          <p className="font-body text-[11px] text-white/30 mt-0.5">
            Priority: OpenRouter → Gemini → OpenAI → Claude
          </p>
        </div>
        {hasAnyKey && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        )}
      </div>

      {/* Keys */}
      <div className="space-y-4">
        <h2 className="font-headline font-semibold text-white/60 uppercase tracking-wider text-xs">
          API Keys
        </h2>

        {/* OpenRouter */}
        <KeyCard
          provider="openrouter"
          value={keys.openrouter}
          onChange={setKey("openrouter")}
          extra={
            <ModelPicker
              apiKey={keys.openrouter}
              selected={keys.openrouterModel}
              onSelect={(id) => setKeys((p) => ({ ...p, openrouterModel: id }))}
            />
          }
        />

        {/* Gemini */}
        <KeyCard
          provider="gemini"
          value={keys.gemini}
          onChange={setKey("gemini")}
          extra={
            <div className="mt-3 relative">
              <select
                value={keys.geminiModel}
                onChange={(e) =>
                  setKeys((p) => ({ ...p, geminiModel: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl font-mono text-[11px] sm:text-xs text-white/80 appearance-none outline-none transition-all cursor-pointer"
                style={{
                  background: "rgba(6,14,32,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <option value="gemini-1.5-flash">
                  Gemini 1.5 Flash (Fast)
                </option>
                <option value="gemini-1.5-pro">
                  Gemini 1.5 Pro (Powerful)
                </option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-3.1-flash">Gemini 3.1 Flash</option>
                <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          }
        />

        {/* OpenAI */}
        <KeyCard
          provider="openai"
          value={keys.openai}
          onChange={setKey("openai")}
          extra={
            <div className="mt-3 relative">
              <select
                value={keys.openaiModel}
                onChange={(e) =>
                  setKeys((p) => ({ ...p, openaiModel: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl font-mono text-[11px] sm:text-xs text-white/80 appearance-none outline-none transition-all cursor-pointer"
                style={{
                  background: "rgba(6,14,32,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                <option value="gpt-4o">GPT-4o (Powerful)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          }
        />

        {/* Claude */}
        <KeyCard
          provider="claude"
          value={keys.claude}
          onChange={setKey("claude")}
          extra={
            <div className="mt-3 relative">
              <select
                value={keys.claudeModel}
                onChange={(e) =>
                  setKeys((p) => ({ ...p, claudeModel: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl font-mono text-[11px] sm:text-xs text-white/80 appearance-none outline-none transition-all cursor-pointer"
                style={{
                  background: "rgba(6,14,32,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <option value="claude-3-haiku-20240307">
                  Claude 3 Haiku (Fast)
                </option>
                <option value="claude-3-5-sonnet-20241022">
                  Claude 3.5 Sonnet (Powerful)
                </option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          }
        />
      </div>

      {/* Security note */}
      <div
        className="flex gap-3 p-4 rounded-xl"
        style={{
          background: "rgba(251,191,36,0.06)",
          border: "1px solid rgba(251,191,36,0.15)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          className="w-4 h-4 shrink-0 mt-0.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          />
        </svg>
        <p className="font-body text-xs text-yellow-400/70 leading-relaxed">
          Keys are stored securely in the database. They are only accessible by
          authenticated admins.
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={async () => {
            const empty = {
              openrouter: "",
              gemini: "",
              openai: "",
              claude: "",
              openrouterModel: "",
              geminiModel: "",
              openaiModel: "",
              claudeModel: "",
            };
            setKeys(empty);
            await fetch("/api/admin/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(empty),
            });
          }}
          className="font-body text-sm text-white/30 hover:text-red-400 transition-colors"
        >
          Clear all keys
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-headline text-sm font-semibold text-white transition-all duration-200 overflow-hidden"
          style={{
            background: saved
              ? "linear-gradient(135deg, #10b981, #059669)"
              : "linear-gradient(135deg, #7c3aed, #a855f7)",
            boxShadow: saved
              ? "0 0 20px rgba(16,185,129,0.3)"
              : "0 0 20px rgba(124,58,237,0.35)",
          }}
        >
          {saved ? (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Saved!
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* ── Ad Revenue Credentials ── */}
      <div className="space-y-6 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div>
          <h2 className="font-headline text-lg font-bold text-white/90 flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" style={{ color: "#a78bfa" }}>
              <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.18.168A4.448 4.448 0 0 1 9.85 7.637c.315-.136.637-.216.95-.232V5.99c-.36.091-.707.246-1.027.43A5.21 5.21 0 0 0 8.33 8.62Z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v.66a4.448 4.448 0 0 0-1.903 1.144C6.8 9.08 6.5 9.86 6.5 10.625c0 .765.3 1.544.847 2.112.544.564 1.327.938 2.153 1.038v.975a.75.75 0 0 0 1.5 0v-.976a4.26 4.26 0 0 0 1.515-.634c.683-.47 1.235-1.25 1.235-2.26 0-1.01-.552-1.79-1.235-2.26a4.26 4.26 0 0 0-1.515-.634v-1.93Z" clipRule="evenodd" />
            </svg>
            Ad Revenue
          </h2>
          <p className="font-body text-sm text-white/40 mt-1">
            Credentials for the{" "}
            <a href="/admin/income" className="text-violet-400 hover:underline">Ad Revenue dashboard</a>.
          </p>
        </div>

        {/* AdMob — one-click OAuth */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(9,19,40,0.55)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "#60a5fa" }} />
            <p className="font-headline text-sm font-semibold text-white/80">Google AdMob</p>
            {adKeys.admob_refresh_token && (
              <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[0.625rem] font-semibold"
                style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Connected
              </span>
            )}
          </div>

          {adKeys.admob_refresh_token ? (
            <div className="space-y-3">
              {/* Connection info */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(6,14,32,0.5)", border: "1px solid rgba(52,211,153,0.15)" }}>
                {adKeys.admob_connected_email && (
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" stroke="#34d399" strokeWidth="1.5" className="w-3.5 h-3.5 flex-none">
                      <circle cx="8" cy="5" r="2.5" /><path strokeLinecap="round" d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                    </svg>
                    <span className="font-body text-sm text-white/70">{adKeys.admob_connected_email}</span>
                  </div>
                )}
                {adKeys.admob_account_id && (
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="w-3.5 h-3.5 flex-none">
                      <rect x="2" y="3" width="12" height="10" rx="1.5" /><path strokeLinecap="round" d="M5 8h6M5 11h4" />
                    </svg>
                    <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{adKeys.admob_account_id}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <a href="/api/admin/oauth/admob"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-body text-sm cursor-pointer transition-all hover:bg-white/5"
                  style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834Z" />
                  </svg>
                  Reconnect
                </a>
                <button type="button"
                  onClick={async () => {
                    await fetch("/api/admin/oauth/admob/disconnect", { method: "POST" });
                    setAdKeys(p => ({ ...p, admob_refresh_token: "", admob_account_id: "", admob_connected_email: "" }));
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-body text-sm cursor-pointer transition-all hover:bg-red-500/10"
                  style={{ color: "rgba(248,113,113,0.6)", border: "1px solid rgba(248,113,113,0.15)" }}>
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                Sign in with the Google account linked to your AdMob dashboard.
                We request read-only access to earnings data — no changes are made.
              </p>

              {/* Google sign-in button */}
              <a href="/api/admin/oauth/admob"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]"
                style={{ background: "white", color: "#1f2937", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </a>

              {/* Dev setup hint */}
              <div className="rounded-xl p-4" style={{ background: "rgba(6,14,32,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-2" style={{ color: "rgba(255,255,255,0.22)" }}>
                  One-time .env setup (developer only)
                </p>
                <p className="font-mono text-[0.625rem] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
                  GOOGLE_CLIENT_ID=…<br />
                  GOOGLE_CLIENT_SECRET=…
                </p>
                <p className="font-body text-[0.5625rem] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.18)" }}>
                  Google Cloud Console → Enable AdMob API → OAuth 2.0 credentials →
                  Authorised redirect URI: <code className="bg-white/5 px-1 rounded">{"{SITE_URL}"}/api/admin/oauth/admob/callback</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Unity Ads */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(9,19,40,0.55)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "#a78bfa" }} />
            <p className="font-headline text-sm font-semibold text-white/80">Unity Ads</p>
            {adKeys.unity_api_key && (
              <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[0.625rem] font-semibold"
                style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Connected
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Organization ID */}
            <div>
              <label className="block font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1.5" style={{ color: "rgba(222,229,255,0.35)" }}>
                Organization ID
              </label>
              <input
                type="text"
                value={adKeys.unity_org_id}
                onChange={e => setAdKeys(p => ({ ...p, unity_org_id: e.target.value }))}
                placeholder="1234567"
                className="w-full px-3.5 py-2.5 rounded-xl font-mono text-sm text-white/80 placeholder:text-white/20 outline-none focus:ring-1 focus:ring-violet-400/30"
                style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <p className="mt-1 font-body text-[0.5625rem]" style={{ color: "rgba(255,255,255,0.2)" }}>
                Found in your Unity Dashboard URL
              </p>
            </div>

            {/* Monetization Stats API Key */}
            <div className="sm:col-span-2">
              <label className="block font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1.5" style={{ color: "rgba(222,229,255,0.35)" }}>
                Monetization Stats API Key
              </label>
              <input
                type="password"
                value={adKeys.unity_api_key}
                onChange={e => setAdKeys(p => ({ ...p, unity_api_key: e.target.value }))}
                placeholder="0dae2ec2c5f9beed…"
                className="w-full px-3.5 py-2.5 rounded-xl font-mono text-sm text-white/80 placeholder:text-white/20 outline-none focus:ring-1 focus:ring-violet-400/30"
                style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
          </div>

          {/* Clear instructions */}
          <div className="rounded-xl p-4 space-y-1.5" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold" style={{ color: "rgba(167,139,250,0.5)" }}>
              Where to find these
            </p>
            <p className="font-body text-xs leading-relaxed" style={{ color: "rgba(167,139,250,0.7)" }}>
              Unity Dashboard → <strong>Monetize</strong> → <strong>Setup</strong> → <strong>API Management</strong>
            </p>
            <ul className="font-body text-xs space-y-1 leading-relaxed" style={{ color: "rgba(167,139,250,0.6)" }}>
              <li>
                <strong>Organization ID</strong> — the number in your Unity Dashboard URL:
                {" "}<code className="bg-violet-500/12 px-1 rounded font-mono text-[0.6875rem]">id.unity.com/organizations/<strong>1234567</strong></code>
              </li>
              <li>
                <strong>Monetization Stats API Key</strong> — under <em>"Monetization Stats API Access"</em> section
                (the long hex string, <strong>not</strong> the LevelPlay UUID key)
              </li>
            </ul>
          </div>
        </div>

        {/* Save ad keys */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={async () => {
              setAdSaved(true);
              await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(adKeys),
              });
              setTimeout(() => setAdSaved(false), 2500);
            }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-headline text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: adSaved
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "linear-gradient(135deg, #7c3aed, #a855f7)",
              boxShadow: adSaved ? "0 0 20px rgba(16,185,129,0.3)" : "0 0 20px rgba(124,58,237,0.35)",
            }}>
            {adSaved ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Ad Credentials
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
