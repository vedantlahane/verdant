"use client";

import React from "react";
import { useThemeMode } from "@/features/shared/ui/useThemeMode";
import { Navbar } from "@/features/landing/components/Navbar";
import { Footer } from "@/features/landing/components/Footer";
import { Hero } from "@/features/landing/components/Hero";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { Features } from "@/features/landing/components/Features";
import { ComponentsSection } from "@/features/landing/components/ComponentsSection";
import { SyntaxSection } from "@/features/landing/components/SyntaxSection";
import { FinalCTA } from "@/features/landing/components/FinalCTA";

export function LandingPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");

  /* FIX: removed isMounted guard that returned null.
     The inline <script> in layout.tsx already sets data-theme
     before React hydrates, so CSS variables work immediately.
     The null return caused a flash of empty page. */

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--page-bg)", color: "var(--text-primary)" }}
    >
      <Navbar
        themeMode={themeMode}
        resolvedTheme={(resolvedTheme ?? "dark") as "light" | "dark"}
        /* FIX: nullish coalescing before the cast, not after */
        setThemeMode={setThemeMode}
      />

      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <ComponentsSection />
        <SyntaxSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}