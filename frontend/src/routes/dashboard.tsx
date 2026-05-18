import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { usePlatform } from "@/context/platform-context";

export const Route = createFileRoute("/dashboard")({
  component: DashboardRedirect,
});

/**
 * /dashboard — role-aware redirect hub.
 * Sends authenticated users to their role-specific dashboard.
 * Unauthenticated users are sent to sign-in.
 */
function DashboardRedirect() {
  const navigate = useNavigate();
  const { user, ready } = usePlatform();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/sign-in" });
      return;
    }
    if (user.role === "reader") {
      navigate({ to: "/dashboard/reader" });
    } else {
      navigate({ to: "/dashboard/writer" });
    }
  }, [ready, user, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full border border-foreground/15 border-t-foreground/60 animate-spin" />
        <p className="font-serif-lit italic text-foreground/65">Opening your studio…</p>
      </div>
    </div>
  );
}
