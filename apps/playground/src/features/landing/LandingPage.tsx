"use client";

import React from "react";
import { useThemeMode } from "@/features/shared/ui/useThemeMode";
import { Navbar } from "@/features/landing/components/Navbar";
import { Footer } from "@/features/landing/components/Footer";
import { Hero } from "@/features/landing/components/Hero";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { Features } from "@/features/landing/components/Features";
import { ComponentsSection } from "@/features/landing/components/ComponentsSection";
import { FinalCTA } from "@/features/landing/components/FinalCTA";

export function LandingPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");

  return (
    <div
      className="min-h-screen selection:bg-[var(--accent)] selection:text-white flex flex-col"
      style={{ background: "var(--page-bg)", color: "var(--text-primary)" }}
    >
      <Navbar
        themeMode={themeMode}
        resolvedTheme={(resolvedTheme ?? "dark") as "light" | "dark"}
        setThemeMode={setThemeMode}
      />

      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <ComponentsSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}