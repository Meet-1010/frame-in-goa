// Colours and fonts lifted from hhgoa.com so the output actually looks like the event.
export const C = {
  green: "#0B6839",
  greenDeep: "#064A28",
  yellow: "#FEE101",
  yellowDim: "#EDD723",
  cream: "#FFFBE8",
  pink: "#FF0080",
  white: "#FFFFFF",
  ink: "#04301A",
} as const;

export const EVENT = {
  name: "Hacker House Goa",
  year: "2026",
  dates: "OCT 28 - 31, 2026",
  place: "GOA, INDIA",
  tagline: "LESS NOISE. MORE SIGNAL.",
  hashtag: "#FrameInGoa",
  site: "hhgoa.com",
} as const;

export type ThemeId = "sunrise" | "susegad" | "lowtide";

export type Theme = {
  id: ThemeId;
  label: string;
  /** page + artwork background */
  bg: string;
  /** primary type on bg */
  ink: string;
  /** accent type on bg */
  kicker: string;
  /** the ring on the frame, the footer strip on the pass */
  band: string;
  bandText: string;
  /** line art (waves, palm keylines) */
  scene: string;
  sun: string;
  sunRay: string;
  accent: string;
};

export const THEMES: Theme[] = [
  {
    id: "sunrise",
    label: "Sunrise",
    bg: C.green,
    ink: C.cream,
    kicker: C.yellow,
    band: C.yellow,
    bandText: C.green,
    scene: C.cream,
    sun: C.yellow,
    sunRay: C.yellow,
    accent: C.pink,
  },
  {
    id: "susegad",
    label: "Susegad",
    bg: C.cream,
    ink: C.green,
    kicker: C.pink,
    band: C.green,
    bandText: C.cream,
    scene: C.green,
    sun: C.yellow,
    sunRay: C.green,
    accent: C.pink,
  },
  {
    id: "lowtide",
    label: "Low tide",
    bg: C.greenDeep,
    ink: C.cream,
    kicker: C.yellow,
    band: C.cream,
    bandText: C.green,
    scene: C.yellow,
    sun: C.yellow,
    sunRay: C.yellow,
    accent: C.pink,
  },
];

export function theme(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
