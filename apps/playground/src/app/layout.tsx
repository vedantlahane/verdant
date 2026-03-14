import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// ── Fonts ──────────────────────────────────────────
// Instrument Serif isn't in next/font/google's stable list,
// so we load it via CSS @import in globals.css.
// Inter + JetBrains Mono use next/font for optimal loading.

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

// ── Metadata ───────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "Verdant — Where architecture grows",
    template: "%s | Verdant",
  },
  description:
    "A developer-first tool that turns simple text into interactive 3D architecture diagrams. Mermaid.js meets Three.js.",
  keywords: [
    "architecture diagrams",
    "3D diagrams",
    "text to diagram",
    "developer tools",
    "system design",
    "mermaid alternative",
    "three.js",
  ],
  authors: [{ name: "Vedant" }],
  creator: "Vedant",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Verdant",
    title: "Verdant — Where architecture grows",
    description:
      "3D architecture diagrams from code. Open source. 🌿",
    // images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Verdant — Where architecture grows",
    description: "3D architecture diagrams from code. Open source. 🌿",
    // images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
};

// ── Layout ─────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      {/* 
        suppressHydrationWarning: theme is set client-side 
        via data-theme attribute to avoid FOUC 
      */}
      <head>
        {/* Instrument Serif from Google Fonts (not in next/font stable) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Inline script to prevent FOUC (flash of unstyled content) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('verdant-theme');
                  if (stored === 'light' || stored === 'dark') {
                    document.documentElement.dataset.theme = stored;
                    document.documentElement.style.colorScheme = stored;
                  } else {
                    var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
                    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
        <Toaster position="bottom-right" richColors theme="system" />
      </body>
    </html>
  );
}