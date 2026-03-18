import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import LeafCursor from "../features/shared/ui/LeafCursor";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  preload: false,
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 1. Next.js Dev Overlay Bypass
                // We kill the unhandledrejection event entirely during the capture phase
                window.addEventListener('unhandledrejection', function(event) {
                  var isCancelation = event.reason && (event.reason.type === 'cancelation' || event.reason.msg === 'operation is manually canceled');
                  var isPlainObject = event.reason && Object.prototype.toString.call(event.reason) === '[object Object]' && !event.reason.message && !event.reason.stack;
                  if (isCancelation || isPlainObject) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);

                // 2. Main Thread Console Suppression
                var oWarn = console.warn;
                var oError = console.error;
                var oLog = console.log;
                function shouldSuppress(msg) {
                  if (typeof msg !== 'string') return false;
                  return msg.includes('THREE.Clock') || 
                         msg.includes('unsupported GPOS table') || 
                         msg.includes('unsupported GSUB table') || 
                         msg.includes('WebGL context lost') ||
                         msg.includes('Context Lost');
                }
                console.warn = function() { if (!shouldSuppress(arguments[0])) oWarn.apply(console, arguments); };
                console.error = function() { if (!shouldSuppress(arguments[0])) oError.apply(console, arguments); };
                console.log = function() { if (!shouldSuppress(arguments[0])) oLog.apply(console, arguments); };

                // 3. Web Worker Console Suppression (for Troika Text generating fonts async)
                var OrigBlob = window.Blob;
                window.Blob = function(blobParts, options) {
                  // Inject completely blindly into any Blob string arrays
                  if (blobParts && Array.isArray(blobParts) && blobParts.length > 0 && typeof blobParts[0] === 'string') {
                    var newParts = blobParts.slice();
                    newParts.unshift(\`
                      if(typeof self !== 'undefined' && self.console) {
                        var _w = self.console.warn;
                        self.console.warn = function() {
                          var m = arguments[0];
                          if(typeof m === 'string' && (m.includes('unsupported GPOS') || m.includes('unsupported GSUB'))) return;
                          if(_w) _w.apply(self.console, arguments);
                        };
                      }
                    \`);
                    return new OrigBlob(newParts, options);
                  }
                  return new OrigBlob(blobParts, options);
                };

                // Fallback: If somehow the worker script is loaded via real URL and not Blob, we can't easily intercept synchronously.
                // But Troika always uses Blob! So Blob intercept is enough.
              })();
            `,
          }}
        />
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
        <LeafCursor />
        {children}
        <Toaster position="bottom-right" richColors theme="system" />
      </body>
    </html>
  );
}