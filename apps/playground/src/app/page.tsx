"use client";

import { useMemo, useState, useEffect } from "react";
import { parseVrd, VrdParserError } from "@repo/parser";
import { VerdantRenderer } from "@repo/renderer";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Moon, Sun, Wand2, Download, Sprout } from "lucide-react";

const INITIAL_VRD = `---
theme: moss
layout: auto
---

database postgres:
  label: "PostgreSQL 16"
  color: "#42f554"
  size: lg

cache redis:
  label: "Redis Cache"
  color: "#f5a442"
  size: md

group backend "Backend Services":
  server auth
  server users
  server orders

server load_balancer:
  label: "Nginx LB"
  color: "#a855f7"

user client

# Edges
client -> load_balancer: "REST API"
load_balancer -> backend.auth: "verifies"
load_balancer -> backend.users: "routes"
load_balancer -> backend.orders: "routes"

backend.auth -> postgres: "reads"
backend.users -> postgres: "reads/writes"
backend.orders -> postgres: "reads/writes"

backend.users -> redis: "caches"
backend.orders -> redis: "caches"
`;

export default function Home() {
  const [code, setCode] = useState(INITIAL_VRD);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { ast, error } = useMemo(() => {
    try {
      const parsed = parseVrd(code);
      return { ast: parsed, error: null };
    } catch (err) {
      return { ast: null, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }, [code]);

  return (
    <div className={\`flex flex-col w-screen h-screen font-sans \${theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'}\`}>
      {/* Header */}
      <header className={\`flex items-center justify-between px-4 py-3 border-b \${theme === 'dark' ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}\`}>
        <div className="flex items-center gap-2">
          <Sprout className="w-6 h-6 text-[#52B788]" />
          <h1 className="text-xl font-bold tracking-tight">Verdant</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            className={\`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors border \${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}\`}
          >
            <Wand2 className="w-4 h-4 text-[#52B788]" />
            <span className="hidden sm:inline">Build with AI</span>
          </button>
          
          <button 
            className={\`p-1.5 rounded-md transition-colors border \${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}\`}
          >
            <Download className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className={\`p-1.5 rounded-md transition-colors border \${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}\`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Split Area */}
      <main className="flex-1 overflow-hidden">
        <PanelGroup direction={isMobile ? "vertical" : "horizontal"}>
          {/* Left Panel: Editor */}
          <Panel defaultSize={40} minSize={20} className="flex flex-col relative z-10">
            <div className={\`flex-1 p-4 \${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}\`}>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className={\`w-full h-full p-2 font-mono text-sm resize-none focus:outline-none bg-transparent \${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800'}\`}
                placeholder="Type your .vrd code here..."
              />
            </div>
            
            {/* Editor Footer */}
            <div className={\`px-4 py-2 text-xs flex items-center justify-between border-t border-b sm:border-b-0 \${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}\`}>
              <div className="flex items-center gap-4">
                <span className={error ? "text-red-500 font-medium" : "text-[#52B788] font-medium"}>
                  {error ? "1 Error" : "0 Errors"}
                </span>
                <span>{code.length} chars</span>
              </div>
              <div>
                {error ? <span className="text-red-500 truncate max-w-[200px] inline-block sm:max-w-md">{error}</span> : "All good"}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className={\`flex items-center justify-center transition-colors \${isMobile ? 'h-2 w-full cursor-row-resize' : 'w-2 h-full cursor-col-resize'} \${theme === 'dark' ? 'bg-zinc-800 hover:bg-[#52B788]' : 'bg-zinc-300 hover:bg-[#52B788]'}\`} />

          {/* Right Panel: 3D Preview */}
          <Panel defaultSize={60} minSize={20} className="relative z-0 bg-transparent flex flex-col">
              <div className="w-full h-full relative">
                {ast ? (
                  <VerdantRenderer 
                    ast={ast} 
                    theme={theme}
                    width="100%" 
                    height="100%" 
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-medium opacity-50 flex-col gap-2 p-8 text-center">
                    <span className="text-red-500 text-lg">Failed to render scene</span>
                    <span className="text-sm font-mono opacity-80">{error}</span>
                  </div>
                )}
                
                {/* 3D Context Hints overlay */}
                <div className="absolute bottom-6 right-6 flex gap-2 opacity-50 pointer-events-none hidden sm:flex">
                    <div className={\`px-2 py-1 text-[10px] font-semibold rounded uppercase tracking-wider border \${theme === 'dark' ? 'bg-black/50 border-zinc-800 text-zinc-400' : 'bg-white/50 border-zinc-300 text-zinc-600'}\`}>
                      orbit: left-click
                    </div>
                    <div className={\`px-2 py-1 text-[10px] font-semibold rounded uppercase tracking-wider border \${theme === 'dark' ? 'bg-black/50 border-zinc-800 text-zinc-400' : 'bg-white/50 border-zinc-300 text-zinc-600'}\`}>
                      pan: right-click
                    </div>
                    <div className={\`px-2 py-1 text-[10px] font-semibold rounded uppercase tracking-wider border \${theme === 'dark' ? 'bg-black/50 border-zinc-800 text-zinc-400' : 'bg-white/50 border-zinc-300 text-zinc-600'}\`}>
                      zoom: scroll
                    </div>
                </div>
              </div>
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
}
