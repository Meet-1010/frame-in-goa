import { promises as fs } from "node:fs";
import path from "node:path";

export type Stored = { card: string; og: string };

const PREFIX = "shares";
const FILES = ["card.jpg", "og.jpg"] as const;
const ID = /^[a-z0-9]{6,24}$/;

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const localDir = path.join(process.cwd(), ".data", PREFIX);

export async function saveShare(id: string, card: Buffer, og: Buffer): Promise<Stored> {
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const opts = { access: "public" as const, contentType: "image/jpeg", addRandomSuffix: false };
    const [a, b] = await Promise.all([
      put(`${PREFIX}/${id}/${FILES[0]}`, card, opts),
      put(`${PREFIX}/${id}/${FILES[1]}`, og, opts),
    ]);
    return { card: a.url, og: b.url };
  }

  const dir = path.join(localDir, id);
  await fs.mkdir(dir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(dir, FILES[0]), card),
    fs.writeFile(path.join(dir, FILES[1]), og),
  ]);
  return localUrls(id);
}

export async function getShare(id: string): Promise<Stored | null> {
  if (!ID.test(id)) return null;

  if (useBlob()) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `${PREFIX}/${id}/`, limit: 4 });
    const card = blobs.find((b) => b.pathname.endsWith(FILES[0]))?.url;
    const og = blobs.find((b) => b.pathname.endsWith(FILES[1]))?.url;
    return card && og ? { card, og } : null;
  }

  try {
    await fs.access(path.join(localDir, id, FILES[0]));
    return localUrls(id);
  } catch {
    return null;
  }
}

export async function readLocal(id: string, file: string) {
  if (!ID.test(id) || !FILES.includes(file as (typeof FILES)[number])) return null;
  try {
    return await fs.readFile(path.join(localDir, id, file));
  } catch {
    return null;
  }
}

function localUrls(id: string): Stored {
  return { card: `/api/i/${id}/${FILES[0]}`, og: `/api/i/${id}/${FILES[1]}` };
}
