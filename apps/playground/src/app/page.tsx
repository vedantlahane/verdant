"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { parseVrd, VrdParserError } from "@repo/parser";
import { VerdantRenderer } from "@repo/renderer";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Moon, Sun, Wand2, Download, Sprout } from "lucide-react";
import Editor, { useMonaco } from "@monaco-editor/react";

const INITIAL_VRD = `# My Architecture
theme: moss

server web-server  
database postgres
cache redis

web-server -> postgres: "queries"
web-server -> redis: "cache reads"
`;

export default function Home() {
  const [code, setCode] = useState(INITIAL_VRD);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isMobile, setIsMobile] = useState(false);

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
      // Register custom language
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

      // Autocomplete Provider
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

          // 1. Root level types (no indent)
          if (!isIndented && trimmed === wordInfo.word) {
            const types = ["server", "database", "cache", "gateway", "service", "user", "group", "cloud", "queue", "storage", "monitor"];
            types.forEach(t => {
              suggestions.push({ label: t, kind: monaco.languages.CompletionItemKind.Keyword, insertText: t, range });
            });
            const configs = ["theme:", "layout:"];
            configs.forEach(c => {
              suggestions.push({ label: c, kind: monaco.languages.CompletionItemKind.Property, insertText: c, range });
            });
          }

          // 2. Properties (must be indented)
          if (isIndented && trimmed === wordInfo.word) {
            const props = ["label:", "color:", "size:", "glow:", "icon:", "position:"];
            props.forEach(p => {
              suggestions.push({ label: p, kind: monaco.languages.CompletionItemKind.Property, insertText: p, range });
            });
          }

          // 3-5. Expected Values
          if (textUntilPosition.includes("size:")) {
            ["sm", "md", "lg", "xl"].forEach(s => {
              suggestions.push({ label: s, kind: monaco.languages.CompletionItemKind.Value, insertText: s, range });
            });
          }
          if (textUntilPosition.includes("theme:")) {
            ["moss", "sage", "fern", "bloom", "ash", "dusk", "stone"].forEach(s => {
              suggestions.push({ label: s, kind: monaco.languages.CompletionItemKind.Value, insertText: s, range });
            });
          }
          if (textUntilPosition.includes("layout:")) {
            ["auto", "grid", "circular"].forEach(s => {
              suggestions.push({ label: s, kind: monaco.languages.CompletionItemKind.Value, insertText: s, range });
            });
          }

          // 6. After typing a node id and space, suggest "->" for connections
          const words = trimmed.split(/\s+/);
          if (!trimmed.includes(":") && !trimmed.includes("->")) {
             if (textUntilPosition.endsWith(" ") && words.length > 0) {
                 suggestions.push({ label: "->", kind: monaco.languages.CompletionItemKind.Operator, insertText: "->", range });
             }
          }

          // 7. After "->", suggest existing valid node ids parsed dynamically via Regex scanning
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
    <div className={`flex flex-col w-screen h-screen font-sans ${theme === 'dark' ? 'bg-[#0a1811] text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-4 py-3 border-b ${theme === 'dark' ? 'border-[#1a3828] bg-[#0c1c14]' : 'border-zinc-200 bg-white'}`}>
        <div className="flex items-center gap-2">
          <Sprout className="w-6 h-6 text-[#52B788]" />
          <h1 className="text-xl font-bold tracking-tight">Verdant</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors border ${theme === 'dark' ? 'bg-[#122e20] border-[#1a3828] hover:bg-[#183b28]' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}`}
          >
            <Wand2 className="w-4 h-4 text-[#52B788]" />
            <span className="hidden sm:inline">Build with AI</span>
          </button>
          
          <button 
            className={`p-1.5 rounded-md transition-colors border ${theme === 'dark' ? 'bg-[#122e20] border-[#1a3828] hover:bg-[#183b28]' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}`}
          >
            <Download className="w-4 h-4" />
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
      <main className="flex-1 overflow-hidden">
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
  );
}
