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
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--page-bg)", color: "var(--text-primary)" }}
    >
      <Navbar
        themeMode={themeMode}
        resolvedTheme={resolvedTheme as "light" | "dark" ?? "dark"}
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
