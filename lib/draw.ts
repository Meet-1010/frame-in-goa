type Ctx = CanvasRenderingContext2D;

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * object-fit: cover. fx/fy are the point of the source image that should land in
 * the middle of the box, clamped so the box always stays covered.
 */
export function cover(
  ctx: Ctx,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { zoom?: number; fx?: number; fy?: number } = {},
) {
  const { zoom = 1, fx = 0.5, fy = 0.42 } = opts;
  const iw = "width" in img ? (img.width as number) : 0;
  const ih = "height" in img ? (img.height as number) : 0;
  if (!iw || !ih) return;

  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = Math.min(x, Math.max(x + w - dw, x + w / 2 - dw * fx));
  const dy = Math.min(y, Math.max(y + h - dh, y + h / 2 - dh * fy));
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function circle(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

export function ring(ctx: Ctx, cx: number, cy: number, outer: number, inner: number, fill: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
  ctx.fillStyle = fill;
  ctx.fill("evenodd");
  ctx.restore();
}

type ArcTextOpts = {
  font: string;
  color: string;
  /** angle of the text centre, radians, 0 = 3 o'clock */
  at: number;
  /** 1 runs clockwise (top arc), -1 anticlockwise (bottom arc) */
  dir?: 1 | -1;
  tracking?: number;
};

export function arcText(ctx: Ctx, text: string, cx: number, cy: number, r: number, o: ArcTextOpts) {
  const dir = o.dir ?? 1;
  ctx.save();
  ctx.font = o.font;
  ctx.fillStyle = o.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width + (o.tracking ?? 0));
  const total = widths.reduce((a, b) => a + b, 0);

  let a = o.at - (dir * (total / 2)) / r;
  chars.forEach((ch, i) => {
    a += (dir * (widths[i] / 2)) / r;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a + (dir === 1 ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += (dir * (widths[i] / 2)) / r;
  });
  ctx.restore();
}

/** Half sun sitting on the horizon, straight rays, dashed reflection. Straight off the event art. */
export function sun(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  o: { color: string; rays?: boolean; reflection?: boolean; rayColor?: string },
) {
  const rayColor = o.rayColor ?? o.color;
  ctx.save();

  ctx.fillStyle = o.color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  if (o.rays !== false) {
    ctx.strokeStyle = rayColor;
    ctx.lineWidth = Math.max(2, r * 0.035);
    ctx.lineCap = "round";
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (Math.PI * (i + 0.5)) / n;
      const inner = r * 1.18;
      const outer = r * (i % 2 === 0 ? 1.62 : 1.42);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.stroke();
    }
  }

  if (o.reflection) {
    ctx.fillStyle = o.color;
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const y = cy + r * (0.14 + i * 0.17);
      const half = r * (0.78 - i * 0.13);
      const th = Math.max(2, r * 0.06 - i * 0.4);
      if (half <= 0) break;
      // broken into a couple of dashes so it reads as water
      const gap = half * 0.22;
      ctx.fillRect(cx - half, y, half - gap, th);
      ctx.fillRect(cx + gap, y, half - gap, th);
    }
  }
  ctx.restore();
}

export function waves(ctx: Ctx, x: number, y: number, w: number, rows: number, color: string, lw: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  for (let r = 0; r < rows; r++) {
    const yy = y + r * lw * 4;
    const step = w / 12;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const xx = x + i * step + (r % 2 ? step * 0.4 : 0);
      ctx.moveTo(xx, yy);
      ctx.quadraticCurveTo(xx + step * 0.25, yy - lw * 1.6, xx + step * 0.5, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

type PalmOpts = {
  leaf: string;
  edge: string;
  trunk: string;
  /** signed: negative leans left, positive leans right */
  lean?: number;
};

/** Crown of fronds over a leaning trunk. Base of the trunk sits at (x, y). */
export function palm(ctx: Ctx, x: number, y: number, h: number, o: PalmOpts) {
  const lean = o.lean ?? 0.18;
  const topX = x + h * lean;
  const topY = y - h;
  const crown = h * 0.5;

  ctx.save();
  ctx.lineJoin = "round";

  // trunk: wide at the sand, thin at the crown
  const foot = h * 0.055;
  const neck = h * 0.018;
  ctx.beginPath();
  ctx.moveTo(x - foot, y);
  ctx.quadraticCurveTo(x + h * lean * 0.3 - neck, y - h * 0.56, topX - neck, topY);
  ctx.lineTo(topX + neck, topY);
  ctx.quadraticCurveTo(x + h * lean * 0.3 + neck * 2, y - h * 0.56, x + foot, y);
  ctx.closePath();
  ctx.fillStyle = o.leaf;
  ctx.fill();
  ctx.strokeStyle = o.trunk;
  ctx.lineWidth = Math.max(2, h * 0.014);
  ctx.stroke();

  const n = 8;
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const a = Math.PI - 0.14 + p * (Math.PI + 0.28);
    const flat = Math.abs(Math.cos(a));
    frond(ctx, topX, topY, crown * (0.74 + 0.26 * flat), a, crown * (0.22 + 0.5 * flat), crown * 0.24, o);
  }

  ctx.fillStyle = o.edge;
  for (const [dx, dy] of [
    [-0.032, 0.028],
    [0.028, 0.042],
    [0.002, 0.07],
  ]) {
    ctx.beginPath();
    ctx.arc(topX + h * dx, topY + h * dy, h * 0.016, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** A single frond: tapered blade following a spine that arcs over and droops at the tip. */
function frond(
  ctx: Ctx,
  ox: number,
  oy: number,
  len: number,
  a: number,
  droop: number,
  wid: number,
  o: PalmOpts,
) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const spine = (t: number) => [ox + dx * len * t, oy + dy * len * t + droop * t * t] as const;
  const nx = -dy;
  const ny = dx;

  const [x1, y1] = spine(0.34);
  const [x2, y2] = spine(0.74);
  const [tx, ty] = spine(1);

  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.bezierCurveTo(x1 + nx * wid, y1 + ny * wid, x2 + nx * wid * 0.6, y2 + ny * wid * 0.6, tx, ty);
  ctx.bezierCurveTo(
    x2 - nx * wid * 0.38,
    y2 - ny * wid * 0.38,
    x1 - nx * wid * 0.62,
    y1 - ny * wid * 0.62,
    ox,
    oy,
  );
  ctx.closePath();
  ctx.fillStyle = o.leaf;
  ctx.fill();
  ctx.strokeStyle = o.edge;
  ctx.lineWidth = Math.max(2, len * 0.035);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.quadraticCurveTo(x1, y1, tx, ty);
  ctx.lineWidth = Math.max(1, len * 0.018);
  ctx.stroke();
}

/** Pink sticker with a fat yellow keyline, same trick as the goa sticker on the site. */
export function sticker(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  o: { font: string; fill: string; stroke: string; rotate?: number; outline?: string },
) {
  ctx.save();
  ctx.translate(x, y);
  if (o.rotate) ctx.rotate((o.rotate * Math.PI) / 180);
  ctx.font = o.font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  const size = fontSize(o.font);
  if (o.outline) {
    ctx.strokeStyle = o.outline;
    ctx.lineWidth = size * 0.32;
    ctx.strokeText(text, 0, 0);
  }
  ctx.strokeStyle = o.stroke;
  ctx.lineWidth = size * 0.22;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = o.fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function pill(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  o: { font: string; bg: string; fg: string; padX?: number; padY?: number; rotate?: number; keyline?: string },
) {
  ctx.save();
  ctx.font = o.font;
  const size = fontSize(o.font);
  const padX = o.padX ?? size * 0.7;
  const padY = o.padY ?? size * 0.5;
  const w = ctx.measureText(text).width + padX * 2;
  const h = size + padY * 2;

  ctx.translate(x, y);
  if (o.rotate) ctx.rotate((o.rotate * Math.PI) / 180);

  roundRect(ctx, 0, -h / 2, w, h, h / 2);
  ctx.fillStyle = o.bg;
  ctx.fill();
  if (o.keyline) {
    ctx.strokeStyle = o.keyline;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.stroke();
  }

  ctx.fillStyle = o.fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, padX, size * 0.04);
  ctx.restore();
  return w;
}

export function fontSize(font: string) {
  const m = font.match(/(\d+(?:\.\d+)?)px/);
  return m ? parseFloat(m[1]) : 16;
}

/** Shrinks the size until the text fits, returns the font string actually used. */
export function fitFont(ctx: Ctx, text: string, maxWidth: number, build: (size: number) => string, from: number, min = 12) {
  let size = from;
  while (size > min) {
    ctx.font = build(size);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return build(size);
}

export function tracked(ctx: Ctx, text: string, x: number, y: number, tracking: number) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
  return cx - x - tracking;
}

export function trackedWidth(ctx: Ctx, text: string, tracking: number) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return Math.max(0, w - tracking);
}

let grainTile: HTMLCanvasElement | null = null;

export function grain(ctx: Ctx, w: number, h: number, alpha = 0.05) {
  if (!grainTile) {
    const t = document.createElement("canvas");
    t.width = t.height = 128;
    const tc = t.getContext("2d")!;
    const img = tc.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + Math.random() * 135;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tc.putImageData(img, 0, 0);
    grainTile = t;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  const p = ctx.createPattern(grainTile, "repeat");
  if (p) {
    ctx.fillStyle = p;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}
