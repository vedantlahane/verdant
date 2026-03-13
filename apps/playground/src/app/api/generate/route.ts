import { NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy", // In production, require actual key
});

const SYSTEM_PROMPT = `You are Verdant AI. You generate .vrd diagram code from English descriptions.
   
Available components: server, database, cache, gateway, service, user, cloud, queue, storage, monitor

Syntax rules:
- First word = component type
- Second word = id  
- Arrow syntax: nodeId -> nodeId: "label"
- Groups: group name "Label": (indented children)
- Config: theme, layout at top

Example:
theme: moss
server web
database db
web -> db: "queries"

Only output valid .vrd code. Nothing else.
No markdown, no explanation.`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      // Mocked fallback for local testing if no key is provided
      console.warn("No OPENAI_API_KEY found. Returning a fallback .vrd response.");
      // Just simulate a sleep and return a mock code
      await new Promise(r => setTimeout(r, 1500));
      return NextResponse.json({
        code: 
`theme: moss
layout: auto

server api
database main_db
cache redis_cache

api -> main_db: "reads/writes"
api -> redis_cache: "session store"`
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
    });

    const output = response.choices[0]?.message?.content || "";
    
    // Strip markdown formatting if any accidentally leaks through
    const cleanOutput = output.replace(/^```(vrd)?/, "").replace(/```$/, "").trim();

    return NextResponse.json({ code: cleanOutput });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate diagram" },
      { status: 500 }
    );
  }
}
