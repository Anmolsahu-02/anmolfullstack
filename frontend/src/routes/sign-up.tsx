import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlatform } from "@/context/platform-context";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { signUp, user } = usePlatform();
  const [role, setRole] = useState<"writer" | "reader">("writer");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      navigate({ to: user.role === "reader" ? "/dashboard/reader" : "/dashboard/writer" });
    }
  }, [navigate, user]);

  const handleSignUp = async () => {
    if (!email || !name || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await signUp(email, password, name, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen grid place-items-center px-5 py-16 bg-gradient-cinematic overflow-hidden">
      {/* CSS-animated background orbs — GPU-only, never blocks inputs */}
      <div
        className="absolute left-16 bottom-20 w-52 h-52 rounded-full blur-3xl pointer-events-none"
        style={{
          background: "var(--gold)",
          opacity: 0.22,
          animation: "float-b 9s ease-in-out infinite",
        }}
      />
      <div
        className="absolute right-12 top-16 w-60 h-60 rounded-full blur-3xl pointer-events-none"
        style={{
          background: "var(--maroon)",
          opacity: 0.18,
          animation: "float-a 12s ease-in-out infinite",
        }}
      />

      {/* Card — one-time entrance only */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-lg paper-texture border border-foreground/15 rounded-2xl shadow-elevated p-7 md:p-9"
      >
        <p className="font-hand text-2xl text-center mb-1" style={{ color: "var(--maroon)" }}>
          ~ begin a new chapter ~
        </p>
        <h1 className="font-display text-5xl text-center" style={{ color: "var(--ink)" }}>
          Sign Up
        </h1>
        <p className="mt-3 text-center font-serif-lit italic text-foreground/70">
          Create your literary studio and publish across languages.
        </p>

        {/* Role Selector */}
        <div className="mt-7">
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/55 mb-3 text-center">
            I want to…
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              id="role-writer-signup"
              type="button"
              onClick={() => setRole("writer")}
              className="relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all duration-200"
              style={{
                borderColor: role === "writer" ? "var(--ink)" : "rgba(0,0,0,0.15)",
                background: role === "writer" ? "var(--ink)" : "transparent",
                color: role === "writer" ? "var(--primary-foreground)" : "inherit",
              }}
            >

              <span className="text-sm font-semibold tracking-wide">I'm a Writer</span>
              <span className="text-xs opacity-70">Create &amp; publish stories</span>
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
              id="role-reader-signup"
              type="button"
              onClick={() => setRole("reader")}
              className="relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all duration-200"
              style={{
                borderColor: role === "reader" ? "var(--maroon)" : "rgba(0,0,0,0.15)",
                background: role === "reader" ? "var(--maroon)" : "transparent",
                color: role === "reader" ? "#fff" : "inherit",
              }}
            >

              <span className="text-sm font-semibold tracking-wide">I'm a Reader</span>
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
          onSubmit={(e) => { e.preventDefault(); handleSignUp(); }}
        >
          <div>
            <label className="block text-xs uppercase tracking-[0.22em] text-foreground/55 mb-2">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 outline-none focus:border-foreground/40"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.22em] text-foreground/55 mb-2">
              Display name
            </label>
            <input
              id="signup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nila Krishnan"
              className="w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 outline-none focus:border-foreground/40"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.22em] text-foreground/55 mb-2">
              Password
            </label>
            <input
              id="signup-password"
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
            id="signup-submit"
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-gradient-ink text-primary-foreground uppercase tracking-[0.2em] text-xs inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/65">
          Already have an account?{" "}
          <Link to="/sign-in" className="ink-underline text-foreground">
            Sign in
          </Link>
        </p>
      </motion.section>
    </main>
  );
}
