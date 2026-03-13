"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { parseVrd, VrdParserError } from "@repo/parser";
import { VerdantRenderer } from "@repo/renderer";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Moon, Sun, Wand2, Download, Sprout, Loader2, X, Share2, Image as ImageIcon, ChevronRight } from "lucide-react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { toast } from "sonner";

const PRESETS = {
  simple: `# Simple Web Stack
theme: moss
server web
database db
web -> db: "queries"`,
  microservices: `# Microservices Architecture
theme: ash
layout: auto
group backend "Backend APIs":
  service users
  service orders
  service inventory
gateway api_gw:
  label: "Kong API Gateway"

cloud aws:
  label: "AWS Cloud"

user client

client -> api_gw: "REST"
api_gw -> backend.users: "/v1/users"
api_gw -> backend.orders: "/v1/orders"
api_gw -> backend.inventory: "/v1/inventory"`,
  aws: `# AWS Infrastructure
theme: stone
cloud aws "us-east-1":
  gateway alb
  group ecs "Fargate Cluster":
    service app1
    service app2
  database rds "Aurora PostgreSQL"
  cache elasticache "Redis"
  storage s3 "Assets"

user -> aws.alb: "HTTPS"
aws.alb -> aws.ecs.app1: "path /auth"
aws.alb -> aws.ecs.app2: "path /api"
aws.ecs.app1 -> aws.rds: "rw"
aws.ecs.app2 -> aws.rds: "rw"
aws.ecs.app2 -> aws.elasticache: "cache data"
aws.ecs.app1 -> aws.s3: "put"`,
  pipeline: `# Data Pipeline
theme: sage
layout: grid

monitor grafana
storage s3
queue kafka
service processor
database warehouse

s3 -> processor: "raw events"
processor -> kafka: "normalized"
kafka -> warehouse: "batch insert"
warehouse -> grafana: "dashboard query"`
};

export default function Home() {
  const [code, setCode] = useState(PRESETS.simple);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isMobile, setIsMobile] = useState(false);
  const [isRendererReady, setIsRendererReady] = useState(false);

  // AI Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  const playgroundRef = useRef<HTMLDivElement>(null);

  // Initialize from hash if present
  useEffect(() => {
    if (window.location.hash) {
      try {
        const decoded = atob(window.location.hash.slice(1));
        setCode(decoded);
      } catch (err) {
        console.warn("Mangled share link");
      }
    }
    const t = setTimeout(() => setIsRendererReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError("");
    
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Generation failed");
      
      setCode(data.code);
      setIsAiModalOpen(false);
      setAiPrompt("");
      toast.success("Successfully generated architecture!");
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = () => {
    try {
      const enc = btoa(code);
      const url = new URL(window.location.href);
      url.hash = enc;
      window.history.replaceState(null, '', url.toString());
      navigator.clipboard.writeText(url.toString());
      toast.success("Shareable link copied to clipboard!");
    } catch (err) {
      toast.error("Code is too large or invalid to share locally");
    }
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'verdant-architecture.png';
      a.click();
      toast.success("Image exported successfully!");
    } else {
      toast.error("Could not locate WebGL canvas to capture");
    }
  };

  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (monaco && !monaco.languages.getLanguages().some((l: any) => l.id === "vrd")) {
      monaco.languages.register({ id: "vrd" });
      monaco.languages.setMonarchTokensProvider("vrd", {
        keywords: ["server", "database", "cache", "gateway", "service", "user", "group", "cloud", "queue", "storage", "monitor"],
        properties: ["label", "color", "size", "glow", "icon", "position"],
        configs: ["theme", "layout", "camera"],
        operators: ["->", ":"],
        tokenizer: {
          root: [
            [/(server|database|cache|gateway|service|user|group|cloud|queue|storage|monitor)\b/, "keyword"],
            [/(theme|layout|camera)\b/, "config"],
            [/(label|color|size|glow|icon|position)\b/, "property"],
            [/->/, "operator"],
            [/:/, "operator"],
            [/#.*/, "comment"],
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/"/, "string", "@string"],
          ],
          string: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape"],
            [/"/, "string", "@pop"]
          ]
        }
      });

      monaco.languages.registerCompletionItemProvider("vrd", {
        provideCompletionItems: (model, position) => {
          const wordInfo = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: wordInfo.startColumn,
            endColumn: wordInfo.endColumn
          };

          const textUntilPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });

          const suggestions: any[] = [];
          const lineContent = model.getLineContent(position.lineNumber);
          const trimmed = textUntilPosition.trim();
          const isIndented = lineContent.match(/^\s+/);

          if (!isIndented && trimmed === wordInfo.word) {
            const types = ["server", "database", "cache", "gateway", "service", "user", "group", "cloud", "queue", "storage", "monitor"];
            types.forEach(t => suggestions.push({ label: t, kind: monaco.languages.CompletionItemKind.Keyword, insertText: t, range }));
            const configs = ["theme:", "layout:"];
            configs.forEach(c => suggestions.push({ label: c, kind: monaco.languages.CompletionItemKind.Property, insertText: c, range }));
          }

          if (isIndented && trimmed === wordInfo.word) {
            const props = ["label:", "color:", "size:", "glow:", "icon:", "position:"];
            props.forEach(p => suggestions.push({ label: p, kind: monaco.languages.CompletionItemKind.Property, insertText: p, range }));
          }

          if (textUntilPosition.includes("size:")) {
            ["sm", "md", "lg", "xl"].forEach(s => suggestions.push({ label: s, kind: monaco.languages.CompletionItemKind.Value, insertText: s, range }));
          }
          if (textUntilPosition.includes("theme:")) {
            ["moss", "sage", "fern", "bloom", "ash", "dusk", "stone"].forEach(s => suggestions.push({ label: s, kind: monaco.languages.CompletionItemKind.Value, insertText: s, range }));
          }
          if (textUntilPosition.includes("layout:")) {
            ["auto", "grid", "circular"].forEach(s => suggestions.push({ label: s, kind: monaco.languages.CompletionItemKind.Value, insertText: s, range }));
          }

          const words = trimmed.split(/\s+/);
          if (!trimmed.includes(":") && !trimmed.includes("->")) {
             if (textUntilPosition.endsWith(" ") && words.length > 0) {
                 suggestions.push({ label: "->", kind: monaco.languages.CompletionItemKind.Operator, insertText: "->", range });
             }
          }

          if (textUntilPosition.includes("->")) {
            const text = model.getValue();
            const nodeRegex = /^(?:server|database|cache|gateway|service|user|group|cloud|queue|storage|monitor)\s+([\w.-]+)/gm;
            const nodeIds = new Set<string>();
            let m;
            while ((m = nodeRegex.exec(text)) !== null) {
              nodeIds.add(m[1]);
            }
            nodeIds.forEach(id => {
               suggestions.push({ label: id, kind: monaco.languages.CompletionItemKind.Reference, insertText: id, range });
            });
          }
          
          return { suggestions };
        }
      });

      monaco.editor.defineTheme("verdant-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "52B788" },
          { token: "operator", foreground: "52B788" },
          { token: "property", foreground: "74c69d" },
          { token: "config", foreground: "D8F3DC", fontStyle: "bold" },
          { token: "string", foreground: "95D5B2" },
          { token: "comment", foreground: "4a6e5c", fontStyle: "italic" }
        ],
        colors: {
          "editor.background": "#0D1F17",
          "editor.foreground": "#B7E4C7",
          "editorLineNumber.foreground": "#4a6e5c"
        }
      });
    }
  }, [monaco]);

  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(theme === "dark" ? "verdant-dark" : "vs");
    }
  }, [monaco, theme]);

  const { ast, error, errorLine } = useMemo(() => {
    try {
      const parsed = parseVrd(code);
      return { ast: parsed, error: null, errorLine: null };
    } catch (err) {
      if (err instanceof VrdParserError) {
        return { ast: null, error: err.message, errorLine: err.line };
      }
      return { ast: null, error: err instanceof Error ? err.message : "Unknown error", errorLine: null };
    }
  }, [code]);

  useEffect(() => {
    if (error) {
       const t = setTimeout(() => toast.error("Syntax Error: " + error, { id: 'vrd-error' }), 1000);
       return () => clearTimeout(t);
    } else {
       toast.dismiss('vrd-error');
    }
  }, [error]);

  useEffect(() => {
    if (monaco && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        if (errorLine) {
          monaco.editor.setModelMarkers(model, "owner", [
            {
              startLineNumber: errorLine,
              startColumn: 1,
              endLineNumber: errorLine,
              endColumn: 1000,
              message: error || "Parse Error",
              severity: monaco.MarkerSeverity.Error
            }
          ]);
        } else {
          monaco.editor.setModelMarkers(model, "owner", []);
        }
      }
    }
  }, [monaco, error, errorLine, code]);

  return (
    <div className={`flex flex-col min-h-screen font-sans ${theme === 'dark' ? 'bg-[#0a1811] text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      
      {/* Landing Hero Section */}
      <div className={`flex flex-col items-center justify-center py-24 px-4 text-center border-b ${theme === 'dark' ? 'bg-gradient-to-b from-[#0a1811] to-[#0D1F17] border-[#1a3828]' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center justify-center p-4 bg-[#52B788]/20 rounded-full mb-6 relative">
             <Sprout className="w-12 h-12 text-[#52B788]" />
             <div className="absolute inset-0 bg-[#52B788] mix-blend-color animate-pulse rounded-full opacity-30 blur-xl"></div>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">Where Architecture Grows <span className="text-[#52B788]">🌿</span></h1>
        <p className={`text-lg sm:text-xl max-w-2xl mb-10 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Verdant is a declarative, text-to-3D architecture diagramming engine. Build, visualize, and share complex systems in seconds.
        </p>
        <button 
          onClick={() => playgroundRef.current?.scrollIntoView({ behavior: 'smooth' })} 
          className="px-6 py-3 bg-[#52B788] hover:bg-[#74c69d] text-[#0a1811] font-bold rounded-full transition-all shadow-[0_0_20px_rgba(82,183,136,0.3)] flex items-center gap-2"
        >
          Try it below <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Playground Area */}
      <div ref={playgroundRef} className="flex flex-col h-screen" style={{ height: '100vh' }}>
        {/* Header */}
        <header className={`flex items-center justify-between px-4 py-3 border-b ${theme === 'dark' ? 'border-[#1a3828] bg-[#0c1c14]' : 'border-zinc-200 bg-white'}`}>
          <div className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-[#52B788]" />
            <h1 className="text-xl font-bold tracking-tight">Verdant</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setIsAiModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors border ${theme === 'dark' ? 'bg-[#122e20] border-[#1a3828] hover:bg-[#183b28]' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}`}
            >
              <Wand2 className="w-4 h-4 text-[#52B788]" />
              <span className="hidden sm:inline">Build with AI</span>
            </button>

            <button 
              onClick={handleShare}
              className={`p-1.5 sm:px-3 sm:py-1.5 flex items-center gap-2 rounded-md transition-colors border ${theme === 'dark' ? 'bg-[#122e20] border-[#1a3828] hover:bg-[#183b28]' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}`}
              title="Share Link"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Share</span>
            </button>
            
            <button 
              onClick={handleExportPNG}
              className={`p-1.5 sm:px-3 sm:py-1.5 flex items-center gap-2 rounded-md transition-colors border ${theme === 'dark' ? 'bg-[#122e20] border-[#1a3828] hover:bg-[#183b28]' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}`}
              title="Export PNG"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Export</span>
            </button>

            <button 
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className={`p-1.5 rounded-md transition-colors border ${theme === 'dark' ? 'bg-[#122e20] border-[#1a3828] hover:bg-[#183b28]' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Main Content Split Area */}
        <main className="flex-1 overflow-hidden flex">
          
          {/* Example Gallery Sidebar */}
          <div className={`w-52 border-r hidden lg:flex flex-col p-4 gap-2 overflow-y-auto ${theme === 'dark' ? 'border-[#1a3828] bg-[#0c1c14]' : 'border-zinc-200 bg-zinc-50'}`}>
             <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Examples</h3>
             {Object.entries(PRESETS).map(([key, val]) => (
                <button 
                  key={key} 
                  onClick={() => setCode(val)}
                  className={`text-left text-sm py-2 px-3 rounded-md transition-colors shadow-sm border ${
                    code === val 
                      ? (theme === 'dark' ? 'bg-[#122e20] border-[#52B788]/50 text-[#52B788]' : 'bg-white border-[#52B788]/50 text-[#52B788]') 
                      : (theme === 'dark' ? 'bg-transparent border-transparent hover:bg-[#1a3828]' : 'bg-transparent border-transparent hover:bg-zinc-200')
                    }`}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                </button>
             ))}
          </div>

          <PanelGroup orientation={isMobile ? "vertical" : "horizontal"}>
            {/* Left Panel: Editor */}
            <Panel defaultSize={40} minSize={20} className="flex flex-col relative z-10">
              <div className={`flex-1 ${theme === 'dark' ? 'bg-[#0D1F17]' : 'bg-white'}`}>
                <Editor
                  height="100%"
                  language="vrd"
                  theme={theme === "dark" ? "verdant-dark" : "light"}
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  onMount={(editor) => { editorRef.current = editor; }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
              
              {/* Editor Footer */}
              <div className={`px-4 py-2 text-xs flex items-center justify-between border-t border-b sm:border-b-0 ${theme === 'dark' ? 'bg-[#0a1811] border-[#1a3828] text-[#B7E4C7]' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>
                <div className="flex items-center gap-4">
                  <span className={error ? "text-red-500 font-medium" : "text-[#52B788] font-medium"}>
                    {error ? "1 Error" : "0 Errors"}
                  </span>
                  <span className="opacity-80">{code.length} chars</span>
                </div>
                <div>
                  {error ? <span className="text-red-500 truncate max-w-[200px] inline-block sm:max-w-md">{error}</span> : "All good"}
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className={`flex items-center justify-center transition-colors ${isMobile ? 'h-2 w-full cursor-row-resize' : 'w-2 h-full cursor-col-resize'} ${theme === 'dark' ? 'bg-[#1a3828] hover:bg-[#52B788]' : 'bg-zinc-300 hover:bg-[#52B788]'}`} />

            {/* Right Panel: 3D Preview */}
            <Panel defaultSize={60} minSize={20} className="relative z-0 bg-transparent flex flex-col">
                <div className="w-full h-full relative">
                  
                  {!isRendererReady && (
                    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-300 ${theme === 'dark' ? 'bg-[#0a1811]' : 'bg-zinc-50'}`}>
                      <Loader2 className="w-10 h-10 animate-spin text-[#52B788] mb-4" />
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Initializing WebGL Engine...</span>
                    </div>
                  )}

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
                  <div className="absolute bottom-6 right-6 flex gap-2 opacity-30 hover:opacity-100 transition-opacity pointer-events-none hidden sm:flex">
                      <div className={`px-2 py-1 text-[10px] font-semibold rounded uppercase tracking-wider border ${theme === 'dark' ? 'bg-black/50 border-[#1a3828] text-[#B7E4C7]' : 'bg-white/50 border-zinc-300 text-zinc-600'}`}>
                        orbit: left-click
                      </div>
                      <div className={`px-2 py-1 text-[10px] font-semibold rounded uppercase tracking-wider border ${theme === 'dark' ? 'bg-black/50 border-[#1a3828] text-[#B7E4C7]' : 'bg-white/50 border-zinc-300 text-zinc-600'}`}>
                        pan: right-click
                      </div>
                      <div className={`px-2 py-1 text-[10px] font-semibold rounded uppercase tracking-wider border ${theme === 'dark' ? 'bg-black/50 border-[#1a3828] text-[#B7E4C7]' : 'bg-white/50 border-zinc-300 text-zinc-600'}`}>
                        zoom: scroll
                      </div>
                  </div>
                </div>
            </Panel>
          </PanelGroup>
        </main>
      </div>

      {/* AI Generation Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className={`w-full max-w-lg rounded-xl flex flex-col shadow-2xl overflow-hidden border ${theme === 'dark' ? 'bg-[#0D1F17] border-[#1a3828]' : 'bg-white border-zinc-200'}`}>
            <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-[#1a3828]' : 'border-zinc-200'}`}>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-[#52B788]" />
                Build Diagram with AI
              </h2>
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-[#1a3828]' : 'hover:bg-zinc-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-[#B7E4C7]' : 'text-zinc-600'}`}>
                Describe your architecture in plain English, and Verdant AI will generate the corresponding `.vrd` schema for you.
              </p>
              
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='e.g., "3 microservices behind a load balancer connecting to a shared database"'
                className={`w-full h-32 p-3 text-sm rounded-lg resize-none border focus:outline-none focus:ring-1 focus:ring-[#52B788] transition-shadow ${
                  theme === 'dark' 
                    ? 'bg-[#0a1811] border-[#1a3828] text-white placeholder-zinc-500' 
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
                disabled={isGenerating}
              />
              
              {aiError && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                  {aiError}
                </div>
              )}
            </div>
            
            <div className={`flex justify-end p-4 border-t gap-3 ${theme === 'dark' ? 'bg-[#0a1811] border-[#1a3828]' : 'bg-zinc-50 border-zinc-200'}`}>
              <button
                onClick={() => setIsAiModalOpen(false)}
                disabled={isGenerating}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                  theme === 'dark' 
                    ? 'border-[#1a3828] hover:bg-[#1a3828] text-white' 
                    : 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!aiPrompt.trim() || isGenerating}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-[#52B788] text-[#0a1811] hover:bg-[#74c69d] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

