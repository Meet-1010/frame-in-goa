import { EVENT, theme, type ThemeId } from "../brand";
import { cover, fitFont, grain, palm, sticker, sun, tracked, trackedWidth, waves } from "../draw";
import { display, deva, mono } from "../fonts";

export const SQUAD_W = 1600;
export const SQUAD_H = 900;
export const MAX_MEMBERS = 6;

export type Member = {
  id: string;
  photo: ImageBitmap | null;
  name: string;
  focus?: { fx: number; fy: number };
};

export type SquadInput = {
  members: Member[];
  themeId: ThemeId;
  team: string;
};

export function renderSquad(ctx: CanvasRenderingContext2D, input: SquadInput) {
  const t = theme(input.themeId);
  const members = input.members.slice(0, MAX_MEMBERS);
  const team = input.team.trim() || "Your Team";

  ctx.save();
  ctx.clearRect(0, 0, SQUAD_W, SQUAD_H);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, SQUAD_W, SQUAD_H);

  // backdrop
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = t.ink;
  ctx.font = display(210, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HACKER HOUSE", SQUAD_W / 2, 470);
  ctx.restore();

  const horizon = 800;
  sun(ctx, SQUAD_W / 2, horizon, 76, { color: t.sun, rayColor: t.sunRay, rays: true });
  waves(ctx, 250, 754, 420, 2, t.scene, 4);
  waves(ctx, 930, 754, 420, 2, t.scene, 4);

  ctx.fillStyle = t.band;
  ctx.fillRect(0, horizon, SQUAD_W, SQUAD_H - horizon);

  palm(ctx, 66, 806, 300, { leaf: t.bg, edge: t.scene, trunk: t.scene, lean: -0.24 });
  palm(ctx, 1546, 806, 312, { leaf: t.bg, edge: t.scene, trunk: t.scene, lean: 0.26 });

  header(ctx, t);
  headline(ctx, t, team, members.length);
  row(ctx, t, members);
  footer(ctx, t, members.length);

  grain(ctx, SQUAD_W, SQUAD_H, 0.045);
  ctx.restore();
}

type T = ReturnType<typeof theme>;

function header(ctx: CanvasRenderingContext2D, t: T) {
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.fillStyle = t.ink;
  ctx.font = mono(26, 700);
  tracked(ctx, "HACKER HOUSE GOA", 88, 84, 7);

  ctx.fillStyle = t.kicker;
  const w = trackedWidth(ctx, EVENT.hashtag, 4);
  tracked(ctx, EVENT.hashtag, SQUAD_W - 88 - w, 84, 4);
  ctx.restore();
}

function headline(ctx: CanvasRenderingContext2D, t: T, team: string, count: number) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = t.kicker;
  ctx.font = mono(24, 700);
  const kicker = count > 1 ? "THE SQUAD" : "THE BUILDER";
  tracked(ctx, kicker, (SQUAD_W - trackedWidth(ctx, kicker, 8)) / 2, 176, 8);

  ctx.fillStyle = t.ink;
  ctx.textAlign = "center";
  ctx.font = fitFont(ctx, team.toUpperCase(), 1180, (s) => display(s, 700), 108, 44);
  ctx.fillText(team.toUpperCase(), SQUAD_W / 2, 268);
  ctx.restore();
}

function row(ctx: CanvasRenderingContext2D, t: T, members: Member[]) {
  const n = Math.max(members.length, 1);
  const gap = 30;
  const avail = 1400;
  const d = Math.min(300, (avail - gap * (n - 1)) / n);
  const total = d * n + gap * (n - 1);
  const startX = (SQUAD_W - total) / 2;
  const cy = 436;
  const band = Math.max(10, d * 0.055);

  for (let i = 0; i < n; i++) {
    const cx = startX + i * (d + gap) + d / 2;
    const r = d / 2;
    const m = members[i];

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - band, 0, Math.PI * 2);
    ctx.clip();
    if (m?.photo) {
      cover(ctx, m.photo, cx - r + band, cy - r + band, (r - band) * 2, (r - band) * 2, m.focus ?? { fy: 0.4 });
    } else {
      ctx.fillStyle = t.bg;
      ctx.fillRect(cx - r, cy - r, d, d);
      sun(ctx, cx, cy + r * 0.34, r * 0.42, { color: t.sun, rayColor: t.sunRay, rays: true });
    }
    ctx.restore();

    ctx.strokeStyle = t.band;
    ctx.lineWidth = band;
    ctx.beginPath();
    ctx.arc(cx, cy, r - band / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = t.accent;
    ctx.lineWidth = Math.max(2, band * 0.22);
    ctx.beginPath();
    ctx.arc(cx, cy, r - band * 1.12, 0, Math.PI * 2);
    ctx.stroke();

    const name = (m?.name || "").trim().toUpperCase();
    if (name) {
      ctx.save();
      ctx.fillStyle = t.ink;
      ctx.textBaseline = "middle";
      ctx.font = fitFont(ctx, name, d + gap - 8, (s) => mono(s, 700), Math.min(28, d * 0.13), 14);
      tracked(ctx, name, cx - trackedWidth(ctx, name, 2) / 2, cy + r + 38, 2);
      ctx.restore();
    }
  }

  // one sticker on the lead photo so the row is not perfectly symmetrical
  const first = startX + d / 2;
  sticker(ctx, "गोवा", first - d * 0.36, cy - d * 0.4, {
    font: deva(Math.max(38, d * 0.22), 800),
    fill: t.accent,
    stroke: t.sun,
    outline: t.bg,
    rotate: -14,
  });
}

function footer(ctx: CanvasRenderingContext2D, t: T, count: number) {
  ctx.save();
  ctx.fillStyle = t.bandText;
  ctx.textBaseline = "middle";
  ctx.font = mono(24, 700);

  const y = 851;
  const pad = 76;
  const left = `${EVENT.dates} · GOA`;
  const leftW = trackedWidth(ctx, left, 2);
  tracked(ctx, left, pad, y, 2);

  const right = `${count} BUILDER${count === 1 ? "" : "S"}`;
  const rightW = trackedWidth(ctx, right, 2);
  tracked(ctx, right, SQUAD_W - pad - rightW, y, 2);

  ctx.font = mono(24, 400);
  const midW = trackedWidth(ctx, EVENT.tagline, 2);
  const midX = (SQUAD_W - midW) / 2;
  if (midX > pad + leftW + 40 && midX + midW < SQUAD_W - pad - rightW - 40) {
    tracked(ctx, EVENT.tagline, midX, y, 2);
  }
  ctx.restore();
}
