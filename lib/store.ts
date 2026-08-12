import { promises as fs } from "node:fs";
import path from "node:path";

export type Stored = { card: string; og: string };

const PREFIX = "shares";
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const localDir = path.join(process.cwd(), ".data", PREFIX);

export async function saveShare(id: string, card: Buffer, og: Buffer): Promise<Stored> {
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const opts = { access: "public" as const, contentType: "image/png", addRandomSuffix: false };
    const [a, b] = await Promise.all([
      put(`${PREFIX}/${id}/card.png`, card, opts),
      put(`${PREFIX}/${id}/og.png`, og, opts),
    ]);
    return { card: a.url, og: b.url };
  }

  const dir = path.join(localDir, id);
  await fs.mkdir(dir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(dir, "card.png"), card),
    fs.writeFile(path.join(dir, "og.png"), og),
  ]);
  return { card: `/api/i/${id}/card.png`, og: `/api/i/${id}/og.png` };
}

export async function getShare(id: string): Promise<Stored | null> {
  if (!/^[a-z0-9]{6,24}$/.test(id)) return null;

  if (useBlob()) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `${PREFIX}/${id}/`, limit: 4 });
    const card = blobs.find((b) => b.pathname.endsWith("card.png"))?.url;
    const og = blobs.find((b) => b.pathname.endsWith("og.png"))?.url;
    return card && og ? { card, og } : null;
  }

  try {
    await fs.access(path.join(localDir, id, "card.png"));
    return { card: `/api/i/${id}/card.png`, og: `/api/i/${id}/og.png` };
  } catch {
    return null;
  }
}

export async function readLocal(id: string, file: string) {
  if (!/^[a-z0-9]{6,24}$/.test(id) || !/^(card|og)\.png$/.test(file)) return null;
  try {
    return await fs.readFile(path.join(localDir, id, file));
  } catch {
    return null;
  }
}
