"use client";

import { useMemo } from "react";
import { parseVrd, VrdParserError } from "@repo/parser";
import { VerdantRenderer } from "@repo/renderer";

const TEST_VRD = `
---
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
  const parsedAST = useMemo(() => {
    try {
      return parseVrd(TEST_VRD);
    } catch (err) {
      if (err instanceof VrdParserError) {
        console.error("Parser Error:", err.message);
      }
      return null;
    }
  }, []);

  return (
    <div className="w-screen h-screen flex bg-zinc-950 font-sans text-white">
      {/* Left panel showing the raw VRD source code nicely formatted */}
      <div className="w-[400px] h-full border-r border-zinc-800 bg-zinc-900 p-6 flex flex-col overflow-y-auto">
        <h1 className="text-xl font-bold mb-2">Verdant Diagram</h1>
        <p className="text-sm text-zinc-400 mb-6">Live AST rendering engine</p>
        
        <div className="bg-black/50 p-4 rounded text-sm text-zinc-300 font-mono whitespace-pre overflow-x-auto flex-1 border border-zinc-800">
          {TEST_VRD.trim()}
        </div>
      </div>

      {/* Right panel hosting the WebGL 3D Canvas */}
      <div className="flex-1 h-full relative">
        {parsedAST ? (
          <VerdantRenderer 
            ast={parsedAST} 
            theme="dark"
            width="100%" 
            height="100%" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 font-bold">
            Failed to parse Verdant AST. Check console.
          </div>
        )}

        <div className="absolute bottom-6 right-6 flex gap-2">
            <div className="px-3 py-1.5 bg-zinc-800 text-xs font-semibold rounded-md border border-zinc-700 shadow-xl pointer-events-none">
              orbit: left-click
            </div>
            <div className="px-3 py-1.5 bg-zinc-800 text-xs font-semibold rounded-md border border-zinc-700 shadow-xl pointer-events-none">
              pan: right-click
            </div>
            <div className="px-3 py-1.5 bg-zinc-800 text-xs font-semibold rounded-md border border-zinc-700 shadow-xl pointer-events-none">
              zoom: scroll
            </div>
        </div>
      </div>
    </div>
  );
}
