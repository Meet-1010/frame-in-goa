// next/font hashes the family names, so read them back off the html element
// instead of hardcoding "Imbue" etc. into the canvas font strings.
let cached: { display: string; mono: string; deva: string } | null = null;

export function families() {
  if (!cached) {
    const s = getComputedStyle(document.documentElement);
    cached = {
      display: s.getPropertyValue("--font-imbue").trim() || "Georgia, serif",
      mono: s.getPropertyValue("--font-victor").trim() || "monospace",
      deva: s.getPropertyValue("--font-baloo").trim() || "sans-serif",
    };
  }
  return cached;
}

export function display(size: number, weight = 700) {
  return `${weight} ${size}px ${families().display}`;
}

export function mono(size: number, weight = 500) {
  return `${weight} ${size}px ${families().mono}`;
}

export function deva(size: number, weight = 800) {
  return `${weight} ${size}px ${families().deva}`;
}

let ready: Promise<void> | null = null;

/** Canvas silently falls back to a system font if we draw before the webfont lands. */
export function fontsReady() {
  if (!ready) {
    ready = (async () => {
      const f = families();
      const wanted = [
        `400 100px ${f.display}`,
        `700 100px ${f.display}`,
        `400 40px ${f.mono}`,
        `700 40px ${f.mono}`,
        `800 80px ${f.deva}`,
      ];
      await Promise.all(
        wanted.map((spec) => document.fonts.load(spec, "HACKER HOUSE गोवा 2026").catch(() => undefined)),
      );
      await document.fonts.ready;
    })();
  }
  return ready;
}
