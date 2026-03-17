import { Theme } from "./types";
import { ThemeColors, THEME_COLORS, DEFAULT_NODE_COLORS } from "./colors";
import { moss } from "./moss";
import { sage } from "./sage";
import { fern } from "./fern";
import { bloom } from "./bloom";
import { dusk } from "./dusk";
import { stone } from "./stone";
import { ember } from "./ember";
import { frost } from "./frost";
import { ash } from "./ash";

export const THEMES_LIST: Theme[] = [
  moss,
  sage,
  fern,
  bloom,
  dusk,
  stone,
  ember,
  frost,
  ash,
];

export type { Theme, ThemeColors };
export { THEME_COLORS, DEFAULT_NODE_COLORS };

export const DEFAULT_THEME = moss;
