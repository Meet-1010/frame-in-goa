import { NextResponse } from "next/server";
import { saveShare } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 20;

const MAX_BYTES = 8 * 1024 * 1024;
const WINDOW = 60_000;
const LIMIT = 12;

const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => (b % 36).toString(36))
    .join("");
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Slow down a second." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const card = form.get("card");
  const og = form.get("og");
  if (!(card instanceof File) || !(og instanceof File)) {
    return NextResponse.json({ error: "Missing image." }, { status: 400 });
  }
  if (card.size > MAX_BYTES || og.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large." }, { status: 413 });
  }

  const [cardBuf, ogBuf] = await Promise.all([
    card.arrayBuffer().then(Buffer.from),
    og.arrayBuffer().then(Buffer.from),
  ]);

  if (!isJpeg(cardBuf) || !isJpeg(ogBuf)) {
    return NextResponse.json({ error: "Unsupported image." }, { status: 415 });
  }

  const id = newId();
  try {
    await saveShare(id, cardBuf, ogBuf);
  } catch (e) {
    console.error("share upload failed", e);
    return NextResponse.json({ error: "Could not save that. Download it instead." }, { status: 500 });
  }

  return NextResponse.json({ id, path: `/s/${id}` });
}

function isJpeg(b: Buffer) {
  return b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}
