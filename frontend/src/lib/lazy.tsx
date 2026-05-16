import { lazy, Suspense } from "react";

export function lazyRoute<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(factory);
}

export function LazyWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen animate-pulse bg-background" />}>{children}</Suspense>;
}