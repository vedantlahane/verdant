"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { parseVrd } from "@repo/parser";
import { ArrowRight, BookOpenText, Github, Monitor, Moon, PenTool, Sun, Telescope } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeMode, useThemeMode } from "./useThemeMode";

const VerdantRenderer = dynamic(
  () => import("@repo/renderer").then((mod) => mod.VerdantRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-[28px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]">
        <div className="h-24 w-24 rounded-full border border-[color:var(--border-subtle)] bg-[radial-gradient(circle,rgba(82,183,136,0.2),transparent_65%)]" />
      </div>
    ),
  },
);

const HERO_AST = parseVrd(`theme: moss
layout: circular
server web
database postgres
cache redis
web -> postgres: "queries"
web -> redis: "reads"`);

const PREVIEW_ASTS: Record<string, ReturnType<typeof parseVrd>> = {
  server: parseVrd("theme: moss\nserver web"),
  database: parseVrd("theme: moss\ndatabase postgres"),
  cache: parseVrd("theme: moss\ncache redis"),
  gateway: parseVrd("theme: dusk\ngateway edge"),
  queue: parseVrd("theme: sage\nservice queue-worker"),
  cloud: parseVrd("theme: dusk\nserver cloud"),
  user: parseVrd("theme: bloom\nuser visitor"),
  service: parseVrd("theme: ash\nservice api"),
};

const HERO_CODE = [
  "# My Architecture",
  "theme: moss",
  "",
  "server web-server",
  "database postgres",
  "cache redis",
  "",
  'web-server -> postgres: "queries"',
  'web-server -> redis: "cache reads"',
];

const FEATURE_SNIPPET = [
  "theme: moss",
  "server web",
  "database db",
  "cache redis",
  'web -> db: "queries"',
];

const THEMES = [
  { name: "Moss", color: "#52B788", gradient: "from-[#2D6A4F] via-[#52B788] to-[#95D5B2]" },
  { name: "Sage", color: "#84A98C", gradient: "from-[#344E41] via-[#52796F] to-[#84A98C]" },
  { name: "Fern", color: "#70E000", gradient: "from-[#386641] via-[#6A994E] to-[#A7C957]" },
  { name: "Bloom", color: "#F4A261", gradient: "from-[#7F5539] via-[#BC6C25] to-[#F4A261]" },
  { name: "Dusk", color: "#7C83FD", gradient: "from-[#283618] via-[#606C38] to-[#7C83FD]" },
];

const COMPONENTS = [
  { id: "server", label: "server", badge: "SRV" },
  { id: "database", label: "database", badge: "DB" },
  { id: "cache", label: "cache", badge: "CAC" },
  { id: "gateway", label: "gateway", badge: "GTW" },
  { id: "queue", label: "queue", badge: "QUE" },
  { id: "cloud", label: "cloud", badge: "CLD" },
  { id: "user", label: "user", badge: "USR" },
  { id: "service", label: "service", badge: "API" },
];

function LeafMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6 transition-transform duration-500 group-hover:-rotate-6 group-hover:translate-y-[-1px]">
      <path
        d="M34 7c-9 1-16 5-20 12-3 5-3 11-1 16 5 0 11-1 16-5C36 24 40 17 41 8c-2-1-4-1-7-1Z"
        fill="url(#leaf-gradient)"
      />
      <path d="M15 34c6-5 11-10 16-17" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="leaf-gradient" x1="10" y1="8" x2="40" y2="37">
          <stop stopColor="#95D5B2" />
          <stop offset="0.55" stopColor="#52B788" />
          <stop offset="1" stopColor="#2D6A4F" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MiniNodePreview({ id, theme }: { id: string; theme: "light" | "dark" }) {
  return <VerdantRenderer ast={PREVIEW_ASTS[id]} theme={theme} width="100%" height="100%" />;
}

function CodeBlock({ lines, large = false }: { lines: string[]; large?: boolean }) {
  return (
    <div className={["verdant-code-block", large ? "verdant-code-block-lg" : ""].join(" ")}>
      <div className="verdant-code-topbar">
        <span className="verdant-code-tab">system.vrd</span>
        <span className="verdant-code-leaf">leaf</span>
      </div>
      <div className="verdant-code-body">
        {lines.map((line, index) => (
          <div key={`${line}-${index}`} className="verdant-code-line">
            <span className="verdant-code-number">{index + 1}</span>
            <span className="verdant-code-content">
              <SyntaxLine line={line} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SyntaxLine({ line }: { line: string }) {
  if (!line) {
    return <span>&nbsp;</span>;
  }

  if (line.startsWith("#")) {
    return <span className="token-comment">{line}</span>;
  }

  if (line.includes("->")) {
    const [left, right] = line.split("->");
    const [target, label] = right.split(":");

    return (
      <>
        <span className="token-id">{left.trim()}</span>
        <span className="token-arrow"> -&gt; </span>
        <span className="token-id">{target.trim()}</span>
        {label && (
          <>
            <span className="token-colon">: </span>
            <span className="token-string">{label.trim()}</span>
          </>
        )}
      </>
    );
  }

  if (line.includes(":")) {
    const [key, value] = line.split(":");

    return (
      <>
        <span className="token-config">{key}</span>
        <span className="token-colon">: </span>
        <span className="token-string">{value.trim()}</span>
      </>
    );
  }

  const [type, id] = line.split(/\s+/, 2);

  return (
    <>
      <span className="token-keyword">{type}</span>
      <span> </span>
      <span className="token-id">{id}</span>
    </>
  );
}

function Navbar({
  themeMode,
  resolvedTheme,
  setThemeMode,
}: {
  themeMode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border-subtle)] bg-[color:var(--page-bg)]/72 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="group inline-flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[radial-gradient(circle_at_top,rgba(82,183,136,0.28),transparent_65%)]">
            <LeafMark />
          </div>
          <span className="text-lg font-medium tracking-[0.12em] text-[color:var(--text-primary)] lowercase">verdant</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-[color:var(--text-secondary)] md:flex">
          <a href="#code" className="inline-flex items-center gap-2 transition hover:text-[color:var(--text-primary)]"><BookOpenText className="h-4 w-4" /> Docs</a>
          <Link href="/playground" className="transition hover:text-[color:var(--text-primary)]">Playground</Link>
          <a href="https://github.com" className="inline-flex items-center gap-2 transition hover:text-[color:var(--text-primary)]"><Github className="h-4 w-4" /> GitHub</a>
        </nav>

        <button
          type="button"
          onClick={() => {
            if (themeMode === "system") {
              setThemeMode(resolvedTheme === "dark" ? "light" : "dark");
              return;
            }

            setThemeMode(themeMode === "dark" ? "light" : "dark");
          }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] text-[color:var(--text-primary)] transition hover:-translate-y-0.5"
          aria-label="Toggle theme"
        >
          {themeMode === "system" ? (
            <Monitor className="h-4 w-4" />
          ) : resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}

export function LandingPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLineCount((current) => (current >= 5 ? 1 : current + 1));
    }, 900);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[color:var(--page-bg)] text-[color:var(--text-primary)]">
      <Navbar themeMode={themeMode} resolvedTheme={resolvedTheme} setThemeMode={setThemeMode} />

      <main>
        <section className="hero-grid relative overflow-hidden">
          <div className="hero-glow" />
          <div className="mx-auto grid max-w-7xl gap-16 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
            <div className="relative z-10">
              <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[color:var(--text-muted)]">Where architecture grows.</p>
              <h1 className="font-display text-6xl leading-none sm:text-7xl lg:text-[8.5rem] breathe-word">
                Breathe.
              </h1>
              <p className="mt-7 max-w-xl text-xl leading-8 text-[color:var(--text-secondary)]">
                Your architecture is <span className="text-[color:var(--accent-primary)]">alive</span>. Let it look like it.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/playground" className="verdant-cta group">
                  Open Verdant Draw <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="relative z-10">
              <div className="pointer-events-none absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(82,183,136,0.18),transparent_70%)] blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]/80 p-3 shadow-[0_35px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="overflow-hidden rounded-[26px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]">
                  <div className="h-[360px] w-full sm:h-[420px]">
                    <VerdantRenderer ast={HERO_AST} theme={resolvedTheme} width="100%" height="100%" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="separator-dashed" />
          <div className="grid gap-10 py-12 md:grid-cols-3">
            {[
              { icon: PenTool, title: "Write", copy: "Describe your system in .vrd syntax or plain English." },
              { icon: null, title: "Grow", copy: "Your diagram renders instantly in 3D." },
              { icon: Telescope, title: "Explore", copy: "Orbit, zoom, export, and share." },
            ].map((item) => (
              <div key={item.title} className="text-center md:text-left">
                <div className="mb-5 flex justify-center md:justify-start">
                  {item.icon ? (
                    <item.icon className="h-7 w-7 text-[color:var(--accent-primary)]" />
                  ) : (
                    <div className="rounded-full border border-[color:var(--border-subtle)] p-2">
                      <LeafMark />
                    </div>
                  )}
                </div>
                <h2 className="font-display text-4xl">{item.title}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[color:var(--text-secondary)]">{item.copy}</p>
              </div>
            ))}
          </div>
          <div className="separator-dashed" />
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl sm:text-5xl">Built to grow with your systems.</h2>
          </div>

          <div className="mt-14 grid overflow-hidden rounded-[34px] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]/75 lg:grid-cols-4">
            <article className="bento-card lg:col-span-2">
              <p className="bento-eyebrow">Syntax you already know</p>
              <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--text-secondary)]">
                If you have written YAML before, `.vrd` feels familiar on day one.
              </p>
              <div className="mt-8">
                <CodeBlock lines={FEATURE_SNIPPET} />
              </div>
            </article>

            <article className="bento-card">
              <p className="bento-eyebrow">.vrd files</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">Plain text. Version controlled. Diffable.</p>
              <div className="mt-8 rounded-[24px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-5">
                <div className="rounded-2xl border border-dashed border-[color:var(--accent-primary)]/35 px-4 py-5 text-center">
                  <div className="mx-auto h-14 w-11 rounded-xl border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,rgba(82,183,136,0.18),transparent)]" />
                  <p className="mt-4 font-mono text-sm text-[color:var(--accent-primary)]">system.vrd</p>
                </div>
              </div>
            </article>

            <article className="bento-card">
              <p className="bento-eyebrow">Git native</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">Your diagrams live next to your code.</p>
              <div className="mt-8 rounded-[24px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-5 font-mono text-xs">
                <div className="space-y-2 text-[color:var(--text-secondary)]">
                  <div className="flex items-center justify-between">
                    <span>+ cache redis</span>
                    <span className="text-[color:var(--accent-primary)]">added</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>+ web -&gt; redis</span>
                    <span className="text-[color:var(--accent-primary)]">edge</span>
                  </div>
                  <div className="flex items-center justify-between opacity-60">
                    <span>theme: moss</span>
                    <span>stable</span>
                  </div>
                </div>
              </div>
            </article>

            <article className="bento-card">
              <p className="bento-eyebrow">10+ ready nodes</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {COMPONENTS.map((component) => (
                  <span key={component.id} className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] px-3 py-2 text-[color:var(--text-secondary)]">
                    {component.label}
                  </span>
                ))}
              </div>
            </article>

            <article className="bento-card lg:col-span-3">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="bento-eyebrow">Themes that set the mood</p>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--text-secondary)]">
                    Same diagram, different atmosphere. Flip the palette without changing the structure.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      type="button"
                      onClick={() => setActiveTheme(theme)}
                      className={[
                        "rounded-full border px-3 py-2 text-sm transition",
                        activeTheme.name === theme.name
                          ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-strong)] text-[color:var(--text-primary)]"
                          : "border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] text-[color:var(--text-secondary)]",
                      ].join(" ")}
                    >
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: theme.color }} />
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`mt-8 rounded-[28px] border border-[color:var(--border-subtle)] bg-gradient-to-r ${activeTheme.gradient} p-[1px]`}>
                <div className="rounded-[27px] bg-[color:var(--surface)] px-5 py-6">
                  <div className="h-32 rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_65%)]" />
                </div>
              </div>
            </article>

            <article className="bento-card lg:col-span-2">
              <p className="bento-eyebrow">Zero to 3D in 5 lines</p>
              <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--text-secondary)]">
                No Three.js plumbing. No WebGL setup. Just describe what exists.
              </p>
              <div className="mt-8 rounded-[24px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-6">
                <div className="space-y-3 font-mono text-sm text-[color:var(--text-secondary)]">
                  {FEATURE_SNIPPET.map((line, index) => (
                    <div key={line} className={index < lineCount ? "opacity-100 transition" : "opacity-20 transition"}>
                      <span className="mr-4 text-[color:var(--accent-primary)]">{index + 1}</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="bento-card lg:col-span-2">
              <p className="bento-eyebrow">Export anything</p>
              <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--text-secondary)]">
                Screenshot, 3D model, walkthrough video, or a 2D fallback for wherever the diagram needs to land.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {["PNG", "GLB", "MP4", "SVG"].map((format) => (
                  <span key={format} className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)]">
                    {format}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="separator-dotdash" />
          <div className="pt-14">
            <h2 className="font-display text-4xl sm:text-5xl">Pieces that fit.</h2>
            <p className="mt-3 max-w-xl text-base text-[color:var(--text-secondary)]">Pre-built 3D nodes. Just use them.</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMPONENTS.map((component) => (
              <article key={component.id} className="component-card group">
                <div className="component-card-inner">
                  <div className="component-static">
                    <span className="rounded-full border border-[color:var(--border-subtle)] px-4 py-3 text-sm tracking-[0.2em] text-[color:var(--accent-primary)]">{component.badge}</span>
                    <p className="mt-4 text-sm uppercase tracking-[0.22em] text-[color:var(--text-muted)]">{component.label}</p>
                  </div>
                  <div className="component-preview">
                    <MiniNodePreview id={component.id} theme={resolvedTheme} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8">
            <a href="#footer" className="text-sm font-medium text-[color:var(--accent-primary)] transition hover:text-[color:var(--text-primary)]">
              Browse all components <ArrowRight className="ml-1 inline h-4 w-4" />
            </a>
          </div>
        </section>

        <section id="code" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="separator-solid" />
          <div className="pt-14">
            <h2 className="font-display text-4xl sm:text-5xl">Where code becomes space.</h2>
          </div>
          <div className="mt-10 flex justify-center">
            <CodeBlock lines={HERO_CODE} large />
          </div>
        </section>

        <section className="hero-grid relative overflow-hidden">
          <div className="hero-glow opacity-80" />
          <div className="mx-auto max-w-5xl px-5 py-28 text-center sm:px-8 sm:py-32">
            <h2 className="font-display text-5xl leading-tight sm:text-6xl">
              Your systems are <span className="text-[color:var(--accent-primary)]">alive</span>.
              <br />
              Let them look like it.
            </h2>
            <div className="mt-10">
              <Link href="/playground" className="verdant-cta group">
                Open Verdant Draw <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer id="footer" className="mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-8">
        <div className="separator-dashed" />
        <div className="grid gap-10 py-12 md:grid-cols-3">
          <div>
            <div className="group inline-flex items-center gap-3">
              <LeafMark />
              <span className="text-lg font-medium lowercase">verdant</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[color:var(--text-secondary)]">Where architecture grows.</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-[color:var(--text-primary)]">Verdant</h3>
            <div className="mt-4 space-y-3 text-sm text-[color:var(--text-secondary)]">
              <Link href="/playground" className="block transition hover:text-[color:var(--text-primary)]">Playground</Link>
              <a href="#code" className="block transition hover:text-[color:var(--text-primary)]">Documentation</a>
              <a href="#footer" className="block transition hover:text-[color:var(--text-primary)]">Components</a>
              <a href="#footer" className="block transition hover:text-[color:var(--text-primary)]">Themes</a>
              <a href="#footer" className="block transition hover:text-[color:var(--text-primary)]">CLI</a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-[color:var(--text-primary)]">Community</h3>
            <div className="mt-4 space-y-3 text-sm text-[color:var(--text-secondary)]">
              <a href="https://github.com" className="block transition hover:text-[color:var(--text-primary)]">GitHub</a>
              <a href="https://discord.com" className="block transition hover:text-[color:var(--text-primary)]">Discord</a>
              <a href="https://x.com" className="block transition hover:text-[color:var(--text-primary)]">X</a>
            </div>
          </div>
        </div>

        <div className="separator-solid" />
        <div className="flex flex-col items-start justify-between gap-6 pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-[color:var(--text-secondary)]">Copyright 2026 Verdant</p>
          <ThemeToggle mode={themeMode} onChange={setThemeMode} />
        </div>
      </footer>
    </div>
  );
}
