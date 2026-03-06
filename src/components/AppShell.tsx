"use client";

import { ReactNode, Suspense } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageViewTracker } from "@/components/PageViewTracker";

const panelPrefixes = ["/admin", "/dashboard", "/soy-veterinario"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPanel = panelPrefixes.some((prefix) => pathname?.startsWith(prefix));

  if (isPanel) {
    return (
      <>
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
