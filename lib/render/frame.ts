import { EVENT, theme, type ThemeId } from "../brand";
import { arcText, cover, grain, palm, ring, sticker, sun, tracked, trackedWidth, waves } from "../draw";
import { deva, mono } from "../fonts";

export const FRAME_SIZE = 1024;

export type FrameInput = {
  photo: ImageBitmap | null;
  themeId: ThemeId;
  zoom: number;
  fx: number;
  fy: number;
};

export function renderFrame(ctx: CanvasRenderingContext2D, input: FrameInput) {
  const S = FRAME_SIZE;
  const t = theme(input.themeId);
  const c = S / 2;
  const outer = S / 2;
  const bandW = 86;
  const inner = outer - bandW;

  ctx.save();
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, S, S);

  // photo (or a stand-in beach so the empty state still looks like something)
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, inner, 0, Math.PI * 2);
  ctx.clip();
  if (input.photo) {
    cover(ctx, input.photo, c - inner, c - inner, inner * 2, inner * 2, {
      zoom: input.zoom,
      fx: input.fx,
      fy: input.fy,
    });
  } else {
    placeholder(ctx, c, inner, t);
  }
  ctx.restore();

  // the branded ring
  ring(ctx, c, c, outer, inner, t.band);

  ctx.strokeStyle = t.bg;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(c, c, inner + 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, outer - bandW * 0.16, 0, Math.PI * 2);
  ctx.stroke();

  const mid = inner + bandW / 2;
  const label = `${EVENT.name.toUpperCase()} ${EVENT.year}`;

  arcText(ctx, label, c, c, mid - 4, {
    font: mono(37, 700),
    color: t.bandText,
    at: Math.PI / 2,
    dir: -1,
    tracking: 7,
  });

  arcText(ctx, EVENT.hashtag.toUpperCase(), c, c, mid - 4, {
    font: mono(33, 700),
    color: t.bandText,
    at: -Math.PI / 2,
    dir: 1,
    tracking: 7,
  });

  diamond(ctx, c - mid, c, 11, t.bandText);

  // goa sticker, same idea as the one on the site. Sits on the upper right
  // diagonal, the gap the two arcs of text leave free.
  const a = -Math.PI * 0.19;
  sticker(ctx, "गोवा", c + Math.cos(a) * mid, c + Math.sin(a) * mid, {
    font: deva(74, 800),
    fill: t.accent,
    stroke: t.sun,
    outline: t.bg,
    rotate: -11,
  });

  grain(ctx, S, S, 0.04);
  ctx.restore();
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = fill;
  ctx.fillRect(-r / 2, -r / 2, r, r);
  ctx.restore();
}

function placeholder(ctx: CanvasRenderingContext2D, c: number, r: number, t: ReturnType<typeof theme>) {
  ctx.fillStyle = t.bg;
  ctx.fillRect(c - r, c - r, r * 2, r * 2);

  const horizon = c + r * 0.46;
  sun(ctx, c, horizon, r * 0.26, { color: t.sun, rayColor: t.sunRay, rays: true, reflection: true });
  waves(ctx, c - r, horizon + r * 0.32, r * 2, 2, t.scene, 4);
  palm(ctx, c - r * 0.6, horizon + 6, r * 0.5, {
    leaf: t.bg,
    edge: t.scene,
    trunk: t.scene,
    lean: -0.2,
  });
  palm(ctx, c + r * 0.62, horizon + 2, r * 0.42, {
    leaf: t.bg,
    edge: t.scene,
    trunk: t.scene,
    lean: 0.22,
  });

  ctx.save();
  ctx.font = mono(28, 700);
  ctx.fillStyle = t.scene;
  ctx.globalAlpha = 0.85;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const msg = "YOUR PHOTO HERE";
  tracked(ctx, msg, c - trackedWidth(ctx, msg, 6) / 2, c - r * 0.34, 6);
  ctx.restore();
}
