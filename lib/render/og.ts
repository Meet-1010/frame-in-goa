import { EVENT, theme, type ThemeId } from "../brand";
import { fitFont, grain, palm, sun, tracked, waves } from "../draw";
import { display, mono } from "../fonts";

// X renders link previews at roughly 2:1, so the square frame gets its own
// composition instead of being letterboxed into two fat empty bands.
export const OG_W = 1200;
export const OG_H = 630;

export function renderOgFrame(
  ctx: CanvasRenderingContext2D,
  art: CanvasImageSource,
  themeId: ThemeId,
  name: string,
) {
  const t = theme(themeId);
  ctx.save();
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, OG_W, OG_H);

  sun(ctx, 930, 572, 112, { color: t.sun, rayColor: t.sunRay, rays: true, reflection: false });
  waves(ctx, 592, 604, 480, 2, t.scene, 4);
  palm(ctx, 1094, 606, 280, { leaf: t.bg, edge: t.scene, trunk: t.scene, lean: 0.22 });

  const size = 456;
  ctx.drawImage(art, 58, (OG_H - size) / 2, size, size);

  const x = 556;
  const maxW = OG_W - x - 64;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = t.kicker;
  ctx.font = mono(24, 700);
  tracked(ctx, "I'M IN FOR", x, 206, 6);

  ctx.fillStyle = t.ink;
  ctx.font = fitFont(ctx, "HACKER HOUSE", maxW, (s) => display(s, 700), 100, 48);
  ctx.fillText("HACKER HOUSE", x, 300);
  ctx.fillText("GOA 2026", x, 382);

  const who = name.trim();
  if (who) {
    ctx.globalAlpha = 0.8;
    ctx.font = fitFont(ctx, who, maxW, (s) => mono(s, 400), 26, 16);
    tracked(ctx, who.slice(0, 40), x, 434, 2);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = t.kicker;
  ctx.font = mono(26, 700);
  tracked(ctx, EVENT.hashtag.toUpperCase(), x, who ? 486 : 458, 5);

  grain(ctx, OG_W, OG_H, 0.04);
  ctx.restore();
}

/** The 16:9 formats only need a hair of letterboxing, so fit them whole. */
export function renderOgWide(ctx: CanvasRenderingContext2D, art: CanvasImageSource, themeId: ThemeId) {
  const t = theme(themeId);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, OG_W, OG_H);

  const scale = OG_H / 900;
  const w = 1600 * scale;
  ctx.drawImage(art, (OG_W - w) / 2, 0, w, OG_H);
}
