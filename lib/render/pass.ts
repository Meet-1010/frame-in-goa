import { C, EVENT, theme, type ThemeId } from "../brand";
import { cover, fitFont, grain, palm, pill, roundRect, sticker, sun, tracked, trackedWidth, waves } from "../draw";
import { display, deva, mono } from "../fonts";
import { builderTitle, passNumber } from "../title";

export const PASS_W = 1600;
export const PASS_H = 900;

export type PassInput = {
  photo: ImageBitmap | null;
  themeId: ThemeId;
  name: string;
  role: string;
  title: string;
  zoom: number;
  fx: number;
  fy: number;
};

export function renderPass(ctx: CanvasRenderingContext2D, input: PassInput) {
  const t = theme(input.themeId);
  const name = input.name.trim() || "Your Name";
  const role = input.role.trim() || "Full stack / AI";
  const title = input.title || builderTitle(name);

  ctx.save();
  ctx.clearRect(0, 0, PASS_W, PASS_H);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, PASS_W, PASS_H);

  ghostWordmark(ctx, t);
  scene(ctx, t);
  footer(ctx, t, name);

  photoPanel(ctx, t, input);
  details(ctx, t, { name, role, title });
  header(ctx, t);

  grain(ctx, PASS_W, PASS_H, 0.045);
  ctx.restore();
}

type T = ReturnType<typeof theme>;

/** Tone on tone wordmark, same move the event site pulls in its hero. */
function ghostWordmark(ctx: CanvasRenderingContext2D, t: T) {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = t.ink;
  ctx.font = display(174, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HACKER HOUSE", 1054, 632);
  ctx.restore();
}

function scene(ctx: CanvasRenderingContext2D, t: T) {
  const horizon = 716;

  sun(ctx, 1348, horizon, 84, { color: t.sun, rayColor: t.sunRay, rays: true, reflection: true });
  waves(ctx, 596, horizon + 44, 640, 3, t.scene, 4);
  waves(ctx, 96, horizon + 26, 420, 2, t.scene, 4);

  ctx.fillStyle = t.band;
  ctx.fillRect(0, 800, PASS_W, PASS_H - 800);

  palm(ctx, 1474, 804, 300, { leaf: t.bg, edge: t.scene, trunk: t.scene, lean: 0.24 });
}

function footer(ctx: CanvasRenderingContext2D, t: T, seed: string) {
  ctx.save();
  ctx.fillStyle = t.bandText;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const y = 851;
  const pad = 76;

  ctx.font = mono(24, 700);
  const left = `${EVENT.dates} · GOA`;
  const leftW = trackedWidth(ctx, left, 2);
  tracked(ctx, left, pad, y, 2);

  const right = passNumber(seed);
  const rightW = trackedWidth(ctx, right, 2);
  tracked(ctx, right, PASS_W - pad - rightW, y, 2);

  ctx.font = mono(24, 400);
  const midW = trackedWidth(ctx, EVENT.tagline, 2);
  const midX = (PASS_W - midW) / 2;
  if (midX > pad + leftW + 40 && midX + midW < PASS_W - pad - rightW - 40) {
    tracked(ctx, EVENT.tagline, midX, y, 2);
  }
  ctx.restore();
}

function photoPanel(ctx: CanvasRenderingContext2D, t: T, input: PassInput) {
  const x = 96;
  const y = 196;
  const w = 424;
  const h = 452;
  const r = 30;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = t.band;
  ctx.fill();
  ctx.restore();

  const pad = 12;
  ctx.save();
  roundRect(ctx, x + pad, y + pad, w - pad * 2, h - pad * 2, r - 8);
  ctx.clip();
  if (input.photo) {
    cover(ctx, input.photo, x + pad, y + pad, w - pad * 2, h - pad * 2, {
      zoom: input.zoom,
      fx: input.fx,
      fy: input.fy,
    });
  } else {
    ctx.fillStyle = t.bg;
    ctx.fillRect(x, y, w, h);
    sun(ctx, x + w / 2, y + h * 0.62, 88, { color: t.sun, rayColor: t.sunRay, rays: true });
    waves(ctx, x, y + h * 0.74, w, 3, t.scene, 4);
    ctx.font = mono(24, 700);
    ctx.fillStyle = t.scene;
    ctx.textBaseline = "middle";
    const msg = "YOUR PHOTO";
    tracked(ctx, msg, x + w / 2 - trackedWidth(ctx, msg, 5) / 2, y + h * 0.28, 5);
  }
  ctx.restore();

  sticker(ctx, "गोवा", x + w - 26, y + 34, {
    font: deva(58, 800),
    fill: t.accent,
    stroke: t.sun,
    outline: t.bg,
    rotate: -10,
  });
}

function details(ctx: CanvasRenderingContext2D, t: T, v: { name: string; role: string; title: string }) {
  const x = 588;
  const maxW = PASS_W - x - 96;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = t.kicker;
  ctx.font = mono(26, 700);
  tracked(ctx, "BUILDER PASS", x, 232, 6);

  ctx.fillStyle = t.ink;
  ctx.font = fitFont(ctx, v.name, maxW, (s) => display(s, 700), 132, 54);
  ctx.fillText(v.name, x, 360);

  ctx.fillStyle = t.ink;
  ctx.globalAlpha = 0.85;
  ctx.font = fitFont(ctx, v.role, maxW, (s) => mono(s, 400), 34, 20);
  ctx.fillText(v.role, x, 418);
  ctx.globalAlpha = 1;

  const chipFont = fitFont(ctx, v.title.toUpperCase(), maxW - 40, (s) => mono(s, 700), 32, 18);
  pill(ctx, v.title.toUpperCase(), x, 505, {
    font: chipFont,
    bg: t.accent,
    fg: C.cream,
    keyline: t.sun,
    rotate: -1.2,
  });

  ctx.restore();
}

function header(ctx: CanvasRenderingContext2D, t: T) {
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.fillStyle = t.ink;
  ctx.font = mono(28, 700);
  tracked(ctx, "HACKER HOUSE GOA", 96, 98, 7);

  ctx.fillStyle = t.kicker;
  const tag = EVENT.hashtag;
  const w = trackedWidth(ctx, tag, 4);
  tracked(ctx, tag, PASS_W - 96 - w, 98, 4);

  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = t.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 132);
  ctx.lineTo(PASS_W - 96, 132);
  ctx.stroke();
  ctx.restore();
}
