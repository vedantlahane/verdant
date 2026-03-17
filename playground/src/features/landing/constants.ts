import { THEMES_LIST } from "@repo/themes";

export const CODE_LINES = [
  "# My Architecture",
  `theme: ${THEMES_LIST[0].name}`,
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

export { THEMES_LIST };
