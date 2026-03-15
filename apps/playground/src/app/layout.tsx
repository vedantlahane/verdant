import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "Verdant — Where architecture grows",
    template: "%s | Verdant",
  },
  description:
    "A developer-first tool that turns simple text into interactive 3D architecture diagrams.",
  keywords: [
    "architecture diagrams",
    "3D diagrams",
    "text to diagram",
    "developer tools",
    "system design",
  ],
  authors: [{ name: "Vedant" }],
  creator: "Vedant",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Verdant",
    title: "Verdant — Where architecture grows",
    description: "3D architecture diagrams from code. Open source.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verdant — Where architecture grows",
    description: "3D architecture diagrams from code. Open source.",
  },
  icons: {
    icon: "/favicon.ico",
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
      <head>
        {/* Cormorant Garamond — display headings */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Instrument+Serif&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var s = localStorage.getItem('verdant-theme');
                  if (s === 'light' || s === 'dark') {
                    document.documentElement.dataset.theme = s;
                    document.documentElement.style.colorScheme = s;
                  } else {
                    var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.dataset.theme = d ? 'dark' : 'light';
                    document.documentElement.style.colorScheme = d ? 'dark' : 'light';
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