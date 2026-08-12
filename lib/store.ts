import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export type Stored = { card: string; og: string };

const PREFIX = "shares";
const FILES = ["card.jpg", "og.jpg"] as const;
const ID = /^[a-z0-9]{6,24}$/;

// Vercel connects Blob over OIDC now: it injects BLOB_STORE_ID and the runtime
// picks up VERCEL_OIDC_TOKEN, with no read-write token anywhere. Older setups
// still use BLOB_READ_WRITE_TOKEN, so treat either one as "blob is configured".
const useBlob = () => Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

// cwd is read only on serverless, so fall back somewhere writable if we ever
// end up here in a deployed environment
const localDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "frame-in-goa", PREFIX)
  : path.join(process.cwd(), ".data", PREFIX);

export async function saveShare(id: string, card: Buffer, og: Buffer): Promise<Stored> {
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const opts = { access: "public" as const, contentType: "image/jpeg", addRandomSuffix: false };
    const [a, b] = await Promise.all([
      put(`${PREFIX}/${id}/${FILES[0]}`, card, opts),
      put(`${PREFIX}/${id}/${FILES[1]}`, og, opts),
    ]);

    // the share page derives these URLs rather than looking them up, so shout if
    // that assumption ever stops holding
    const derived = blobUrls(id);
    if (derived && derived.og !== b.url) {
      console.warn("blob url convention changed", { derived: derived.og, actual: b.url });
    }
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

/**
 * Public blob URLs are a pure function of the id: put() writes to a fixed
 * pathname with addRandomSuffix off, and the host comes from the store id.
 *
 * This used to call list() instead, which was the reason a freshly shared link
 * showed no card on X. list() is an index and is eventually consistent, so the
 * crawler could arrive before the upload appeared in it, get a 404, and cache
 * that. Deriving the URL costs no round trip and cannot race the upload.
 */
function blobUrls(id: string): Stored | null {
  const store = process.env.BLOB_STORE_ID;
  if (!store) return null;
  const host = `${store.replace(/^store_/, "").toLowerCase()}.public.blob.vercel-storage.com`;
  return {
    card: `https://${host}/${PREFIX}/${id}/${FILES[0]}`,
    og: `https://${host}/${PREFIX}/${id}/${FILES[1]}`,
  };
}

export async function getShare(id: string): Promise<Stored | null> {
  if (!ID.test(id)) return null;

  if (useBlob()) {
    const derived = blobUrls(id);
    if (derived) return derived;

    // only reachable on a read-write-token setup, where there is no store id to
    // build the host from
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
