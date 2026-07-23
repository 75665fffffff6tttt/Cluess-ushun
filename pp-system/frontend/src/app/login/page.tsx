"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Lock, User as UserIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n, LANGS, Lang } from "@/lib/i18n";
import { apiError } from "@/lib/api";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password, remember);
      router.replace("/dashboard");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-[color:var(--card)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-700 text-white">
            <Leaf size={32} />
          </div>
          <h1 className="text-xl font-bold text-[color:var(--text)]">{t("app_name")}</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{t("government_portal")}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--text)]">{t("username")}</label>
            <div className="relative">
              <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
              <input
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] py-2.5 pl-10 pr-3 text-[color:var(--text)] outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/30"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--text)]">{t("password")}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
              <input
                type={showPw ? "text" : "password"}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] py-2.5 pl-10 pr-10 text-[color:var(--text)] outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[color:var(--muted)]">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {t("remember_me")}
            </label>
            <span className="cursor-not-allowed text-green-700">{t("forgot_password")}</span>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 py-2.5 font-semibold text-white transition hover:bg-green-800 disabled:opacity-60"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}
            {t("sign_in")}
          </button>
        </form>

        <div className="mt-6 flex justify-center gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code as Lang)}
              className={`rounded px-2 py-1 text-xs ${lang === l.code ? "bg-green-700 text-white" : "text-[color:var(--muted)]"}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-[color:var(--muted)]">
          Demo: superadmin / password
        </p>
      </div>
    </div>
  );
}
