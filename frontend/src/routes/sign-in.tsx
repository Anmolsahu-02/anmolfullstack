import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlatform } from "@/context/platform-context";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { signIn, user } = usePlatform();
  const [role, setRole] = useState<"writer" | "reader">("writer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      navigate({ to: user.role === "reader" ? "/dashboard/reader" : "/dashboard/writer" });
    }
  }, [navigate, user]);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen grid place-items-center overflow-hidden px-5 py-16 bg-gradient-cinematic">
      {/* CSS-animated background orbs — GPU-only, never blocks inputs */}
      <div
        className="absolute left-10 top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none"
        style={{
          background: "var(--gold)",
          opacity: 0.25,
          animation: "float-a 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute right-8 bottom-10 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{
          background: "var(--maroon)",
          opacity: 0.22,
          animation: "float-b 11s ease-in-out infinite",
        }}
      />

      {/* Card — one-time entrance only, no looping */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-lg paper-texture border border-foreground/15 rounded-2xl shadow-elevated p-7 md:p-9"
      >
        <p className="font-hand text-2xl text-center mb-1" style={{ color: "var(--maroon)" }}>
          ~ welcome back ~
        </p>
        <h1 className="font-display text-5xl text-center" style={{ color: "var(--ink)" }}>
          Sign In
        </h1>
        <p className="mt-3 text-center font-serif-lit italic text-foreground/70">
          Return to your writing desk and continue the manuscript.
        </p>

        {/* Role Selector */}
        <div className="mt-7">
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/55 mb-3 text-center">
            I am a…
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              id="role-writer-signin"
              type="button"
              onClick={() => setRole("writer")}
              className="relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all duration-200"
              style={{
                borderColor: role === "writer" ? "var(--ink)" : "rgba(0,0,0,0.15)",
                background: role === "writer" ? "var(--ink)" : "transparent",
                color: role === "writer" ? "var(--primary-foreground)" : "inherit",
              }}
            >

              <span className="text-sm font-semibold tracking-wide">Writer</span>
              <span className="text-xs opacity-70">Create &amp; publish</span>
              {role === "writer" && (
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ background: "var(--gold)", color: "#000" }}
                >
                  ✓
                </span>
              )}
            </button>

            <button
              id="role-reader-signin"
              type="button"
              onClick={() => setRole("reader")}
              className="relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all duration-200"
              style={{
                borderColor: role === "reader" ? "var(--maroon)" : "rgba(0,0,0,0.15)",
                background: role === "reader" ? "var(--maroon)" : "transparent",
                color: role === "reader" ? "#fff" : "inherit",
              }}
            >

              <span className="text-sm font-semibold tracking-wide">Reader</span>
              <span className="text-xs opacity-70">Browse &amp; discover</span>
              {role === "reader" && (
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ background: "var(--gold)", color: "#000" }}
                >
                  ✓
                </span>
              )}
            </button>
          </div>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => { e.preventDefault(); handleSignIn(); }}
        >
          <div>
            <label className="block text-xs uppercase tracking-[0.22em] text-foreground/55 mb-2">
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aarav@example.com"
              className="w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 outline-none focus:border-foreground/40"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.22em] text-foreground/55 mb-2">
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 outline-none focus:border-foreground/40"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            id="signin-submit"
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-gradient-ink text-primary-foreground uppercase tracking-[0.2em] text-xs inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              "Enter Studio"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/65">
          New here?{" "}
          <Link to="/sign-up" className="ink-underline text-foreground">
            Create your account
          </Link>
        </p>
      </motion.section>
    </main>
  );
}
