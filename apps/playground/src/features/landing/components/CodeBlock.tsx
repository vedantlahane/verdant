import { Leaf } from "../../playground/components/Leaf";

function SyntaxLine({ line }: { line: string }) {
  if (!line) return <span>&nbsp;</span>;
  if (line.startsWith("#")) return <span className="tok-comment">{line}</span>;

  if (line.includes("->")) {
    const idx = line.indexOf("->");
    const left = line.slice(0, idx).trim();
    const rest = line.slice(idx + 2);
    const colonIdx = rest.indexOf(":");
    if (colonIdx >= 0) {
      return (
        <>
          <span className="tok-id">{left}</span>
          <span className="tok-arrow"> → </span>
          <span className="tok-id">{rest.slice(0, colonIdx).trim()}</span>
          <span className="tok-colon">: </span>
          <span className="tok-string">{rest.slice(colonIdx + 1).trim()}</span>
        </>
      );
    }
    return (
      <>
        <span className="tok-id">{left}</span>
        <span className="tok-arrow"> → </span>
        <span className="tok-id">{rest.trim()}</span>
      </>
    );
  }

  if (line.includes(":")) {
    const [key, ...rest] = line.split(":");
    return (
      <>
        <span className="tok-config">{key}</span>
        <span className="tok-colon">:</span>
        <span className="tok-string"> {rest.join(":").trim()}</span>
      </>
    );
  }

  const parts = line.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (
      <>
        <span className="tok-type">{parts[0]}</span>{" "}
        <span className="tok-id">{parts.slice(1).join(" ")}</span>
      </>
    );
  }

  return <span className="tok-id">{line}</span>;
}

export function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <div className="code-block">
      <div className="code-topbar">
        <span>system.vrd</span>
        <Leaf className="h-3.5 w-3.5" />
      </div>
      <div className="code-body">
        {lines.map((line, i) => (
          <div key={i} className="code-line">
            <span className="code-number">{i + 1}</span>
            <span>
              <SyntaxLine line={line} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
