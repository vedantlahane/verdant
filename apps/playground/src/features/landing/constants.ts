export const CODE_LINES = [
  "# My Architecture",
  "theme: moss",
  "",
  "server web-server",
  "database postgres",
  "cache redis",
  "",
  'web-server -> postgres: "queries"',
  'web-server -> redis: "cache reads"',
];

export const COMPONENTS = [
  "server", "database", "cache", "gateway", "queue",
  "cloud", "user", "service", "storage", "monitor",
];

export const THEMES_LIST = [
  { name: "moss", color: "#52B788" },
  { name: "sage", color: "#84A98C" },
  { name: "fern", color: "#70E000" },
  { name: "bloom", color: "#EC4899" },
  { name: "dusk", color: "#A855F7" },
  { name: "stone", color: "#64748B" },
  { name: "ember", color: "#F59E0B" },
  { name: "frost", color: "#38BDF8" },
];
