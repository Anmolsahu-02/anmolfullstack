import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Nav = lazy(() => import("@/components/akshar/Nav").then(m => ({ default: m.Nav })));
const Hero = lazy(() => import("@/components/akshar/Hero").then(m => ({ default: m.Hero })));
const Discover = lazy(() => import("@/components/akshar/Discover").then(m => ({ default: m.Discover })));
const Screenplay = lazy(() => import("@/components/akshar/Screenplay").then(m => ({ default: m.Screenplay })));
const Poetry = lazy(() => import("@/components/akshar/Poetry").then(m => ({ default: m.Poetry })));
const Languages = lazy(() => import("@/components/akshar/Languages").then(m => ({ default: m.Languages })));
const Search = lazy(() => import("@/components/akshar/Search").then(m => ({ default: m.Search })));
const Footer = lazy(() => import("@/components/akshar/Footer").then(m => ({ default: m.Footer })));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-foreground/10 animate-pulse" />
          <div className="h-6 w-48 mx-auto bg-foreground/10 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AKSHAR — Where stories stay alive" },
      { name: "description", content: "A multilingual home for Indian poets, lyricists, storytellers, and screenplay writers. Read, write, publish — in every language you dream in." },
      { property: "og:title", content: "AKSHAR — Where stories stay alive" },
      { property: "og:description", content: "A multilingual home for Indian poets, lyricists, storytellers, and screenplay writers." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative">
      <Suspense fallback={<PageLoader />}>
        <Nav />
        <Hero />
        <Discover />
        <Screenplay />
        <Poetry />
        <Search />
        <Languages />
        <Footer />
      </Suspense>
    </main>
  );
}
