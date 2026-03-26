"use client";

import React, { useState } from "react";
import { useThemeMode } from "@/features/shared/hooks/useThemeMode";
import { Navbar } from "@/features/landing/components/Navbar";
import { Footer } from "@/features/landing/components/Footer";
import { DocsContent } from "./components/DocsContent";
import { PlotterReveal } from "@/features/shared/ui/PlotterReveal";
import { LeafRain } from "@/features/shared/ui/LeafRain";

export function DocsPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");
  const [activeSection, setActiveSection] = useState("overview");

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "basic-syntax", label: "Basic Syntax" },
    { id: "configuration", label: "Configuration" },
    { id: "nodes", label: "Nodes" },
    { id: "edges", label: "Edges" },
    { id: "groups", label: "Groups" },
    { id: "ports", label: "Ports" },
    { id: "animations", label: "Animations" },
    { id: "node-types", label: "Built-in Types" },
    { id: "shapes", label: "Shapes" },
    { id: "properties", label: "Properties" },
    { id: "examples", label: "Examples" },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[var(--page-bg)]">
      <Navbar
        themeMode={themeMode}
        resolvedTheme={(resolvedTheme ?? "dark") as "light" | "dark"}
        setThemeMode={setThemeMode}
      />

      <main className="flex-1 w-full pb-20">
        <PlotterReveal distance={100}>
          <section className="grid-section">
            <div className="frame-grid">
              <div className="frame-gutter pattern-dots border-r border-[var(--border)] py-10 opacity-30">
                <div className="crosshair crosshair-pulse" />
              </div>

              <div className="flex flex-col bg-[var(--page-bg)]">
                <div className="px-5 py-3 md:px-8 border-b border-[var(--border)]">
                  <span className="section-label text-[var(--accent)] font-semibold lowercase tracking-widest">// technical reference</span>
                </div>

                <div className="grid-lines grid-cols-1">
                  <div className="px-6 py-16 md:py-24 md:px-10 pattern-topo relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 font-mono text-[10rem] select-none pointer-events-none">
                      DOC
                    </div>
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 mb-8 bg-[var(--accent-faint)] border border-[var(--border)] px-3 py-1 rounded-sm">
                        <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
                        <span className="font-mono text-[10px] tracking-widest text-[var(--accent)] uppercase font-bold">
                          blueprint.v0.1
                        </span>
                      </div>
                      <h1 className="font-display text-7xl md:text-[8.5rem] leading-[0.9] tracking-tighter mb-8">
                        Verdant <span className="text-[var(--accent)]">Language</span>
                      </h1>
                      <p className="font-body text-xl md:text-2xl text-[color:var(--text-secondary)] max-w-2xl leading-relaxed">
                        Explore the syntax that describes complex 3D architectures. 
                        Simple primitives growing into interactive systems.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="frame-gutter pattern-hatch border-l border-[var(--border)] py-10 opacity-30">
                <div className="crosshair" />
              </div>
            </div>
          </section>
        </PlotterReveal>

        {/* ═══ ARCHITECTURAL SECTION: DOCUMENTATION GRID ═══ */}
        <section className="grid-section">
          <div className="frame-grid">
            <div className="frame-gutter pattern-dots border-r border-[var(--border)] py-10 opacity-30">
              <div className="flex flex-col h-full items-center justify-between">
                <div className="gutter-coord text-[10px]">LN.01</div>
                <div className="gutter-mark h-64" />
                <div className="gutter-coord mt-auto text-[10px]">LN.99</div>
              </div>
            </div>

            <div className="flex flex-col bg-[var(--border)] grid-lines md:grid-cols-[280px_1fr]">
              {/* Index Cell - Integrated into structural lines */}
              <div className="bg-[var(--page-bg)] flex flex-col md:sticky md:top-14 h-fit md:h-[calc(100vh-56px)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
                  <span className="section-label uppercase tracking-widest text-[var(--accent)]">// index</span>
                </div>
                <nav className="flex-1 overflow-y-auto scrollbar-hide py-4">
                  {sections.map((section, idx) => (
                    <LeafRain
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`group px-6 py-4 flex items-center gap-4 transition-all relative overflow-hidden cursor-pointer ${
                        activeSection === section.id
                          ? "bg-[var(--accent-faint)]"
                          : "hover:bg-[var(--surface)] text-[color:var(--text-secondary)]"
                      }`}
                    >
                      {/* Architectural Line Item Style */}
                      <div className={`w-1 h-8 bg-[var(--accent)] absolute left-0 transition-transform duration-300 ${activeSection === section.id ? 'scale-y-100' : 'scale-y-0'}`} />
                      
                      <span className={`font-mono text-[10px] tabular-nums transition-colors ${activeSection === section.id ? 'text-[var(--accent)] font-bold' : 'opacity-40'}`}>
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      <span className={`font-ui text-sm uppercase tracking-tight ${activeSection === section.id ? 'text-[color:var(--text-primary)] font-semibold' : ''}`}>
                        {section.label}
                      </span>
                    </LeafRain>
                  ))}
                </nav>
                {/* Decorative drafting detail */}
                <div className="mt-auto p-6 border-t border-[var(--border)] pattern-hatch opacity-5 h-32" />
              </div>

              {/* Content Cell - Integrated into structural lines */}
              <div className="bg-[var(--page-bg)] flex flex-col min-h-screen">
                <article className="px-6 py-16 md:px-12 md:py-20 max-w-4xl">
                  <PlotterReveal distance={80}>
                    <DocsContent activeSection={activeSection} />
                  </PlotterReveal>
                </article>
                
                {/* Internal blueprint decoration row */}
                <div className="mt-auto border-t border-[var(--border)] grid grid-cols-2 divide-x divide-[var(--border)] bg-[var(--surface)]">
                  <div className="px-6 py-4 flex justify-between items-center opacity-30 font-mono text-[10px]">
                     <span>ID::{activeSection}</span>
                     <div className="w-8 h-px bg-[var(--accent)]" />
                  </div>
                  <div className="px-6 py-4 flex justify-between items-center opacity-30 font-mono text-[10px]">
                     <span>STAT::GROWN</span>
                     <div className="w-8 h-px bg-[var(--accent)]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="frame-gutter pattern-hatch border-l border-[var(--border)] py-10 opacity-30">
               <div className="flex flex-col h-full items-center">
                  <div className="crosshair mb-12" />
                  <div className="gutter-coord rotate-90 whitespace-nowrap mb-20 uppercase text-[10px]">SPEC.TECHNICAL</div>
                  <div className="gutter-mark flex-1" />
                  <div className="crosshair mt-12" />
               </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ SECTION 3: FOOTER ═══ */}
      <PlotterReveal>
        <Footer />
      </PlotterReveal>
    </div>
    
  );
}
