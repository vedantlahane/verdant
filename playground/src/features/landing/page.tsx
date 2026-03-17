"use client";

import React from "react";
import { useThemeMode } from "@/features/shared/hooks/useThemeMode";
import { Navbar } from "@/features/landing/components/Navbar";
import { Footer } from "@/features/landing/components/Footer";
import { Hero } from "@/features/landing/components/Hero";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { Features } from "@/features/landing/components/Features";
import { ComponentsSection } from "@/features/landing/components/ComponentsSection";
import { FinalCTA } from "@/features/landing/components/FinalCTA";
import { PlotterReveal } from "@/features/shared/ui/PlotterReveal";

export function LandingPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        themeMode={themeMode}
        resolvedTheme={(resolvedTheme ?? "dark") as "light" | "dark"}
        setThemeMode={setThemeMode}
      />

      {/* FIX: Removed 'overflow-x-hidden' from main. 
          Standardizing scroll to the <html>/<body> level prevents the double scrollbar.
      */}
      <main className="flex-1 w-full">
        <Hero />
        
        <PlotterReveal>
          <HowItWorks />
        </PlotterReveal>
        
        <PlotterReveal>
          <Features />
        </PlotterReveal>
        
        <PlotterReveal>
          <ComponentsSection />
        </PlotterReveal>
        
        <PlotterReveal>
          <FinalCTA />
        </PlotterReveal>
      </main>

      {/* Footer also wrapped in PlotterReveal */}
      <PlotterReveal>
        <Footer />
      </PlotterReveal>
    </div>
  );
}