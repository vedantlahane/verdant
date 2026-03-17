"use client";
import { useEffect } from "react";

export default function LeafCursor() {
  useEffect(() => {
    function setLeafCursorFromColor(color: string) {
      if (!color) return;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24"><path d="M34 7c-9 1-16 5-20 12-3 5-3 11-1 16 5 0 11-1 16-5C36 24 40 17 41 8c-2-1-4-1-7-1Z" fill="${color}"/></svg>`;
      const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
      const cursorValue = `url("data:image/svg+xml;charset=UTF-8,${encoded}") 12 12, auto`;
      document.documentElement.style.setProperty("--leaf-cursor", cursorValue);
    }

    function update() {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      setLeafCursorFromColor(accent || "#52B788");
    }

    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });
    return () => mo.disconnect();
  }, []);

  return null;
}