"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Stage from "./Stage";
import { EVENT, THEMES, type ThemeId } from "@/lib/brand";
import { caption, fileName, intentUrl, type Format } from "@/lib/caption";
import { fontsReady } from "@/lib/fonts";
import { canvasToBlob, decode, focalPoint, ImageError } from "@/lib/image";
import { FRAME_SIZE, renderFrame } from "@/lib/render/frame";
import { PASS_H, PASS_W, renderPass } from "@/lib/render/pass";
import { MAX_MEMBERS, renderSquad, SQUAD_H, SQUAD_W, type Member } from "@/lib/render/squad";
import { OG_H, OG_W, renderOgFrame, renderOgWide } from "@/lib/render/og";
import { builderTitle } from "@/lib/title";

type View = { zoom: number; fx: number; fy: number };

const START: View = { zoom: 1, fx: 0.5, fy: 0.42 };

const FORMATS: { value: Format; label: string; blurb: string }[] = [
  { value: "frame", label: "PFP Frame", blurb: "Square profile picture with the HH Goa ring." },
  { value: "pass", label: "Builder Pass", blurb: "Badge with your name, stack and builder class." },
  { value: "squad", label: "Squad Frame", blurb: "Up to six teammates in one combined frame." },
];

export default function Studio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const squadRef = useRef<HTMLInputElement | null>(null);
  const uploading = useRef<Promise<string> | null>(null);

  const [format, setFormat] = useState<Format>("frame");
  const [themeId, setThemeId] = useState<ThemeId>("sunrise");
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const [view, setView] = useState<View>(START);
  const [autoView, setAutoView] = useState<View>(START);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [nudge, setNudge] = useState(0);
  const [team, setTeam] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "photo" | "share" | "download">(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shared, setShared] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  const title = builderTitle(name || "builder", nudge);
  const isSquad = format === "squad";

  // probed after mount so the server render and the first client render agree
  const [fileShare, setFileShare] = useState(false);
  useEffect(() => setFileShare(canShareFiles()), []);

  const draw = useCallback(async () => {
    await fontsReady();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const [w, h] =
      format === "frame" ? [FRAME_SIZE, FRAME_SIZE] : format === "pass" ? [PASS_W, PASS_H] : [SQUAD_W, SQUAD_H];
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (format === "frame") renderFrame(ctx, { photo, themeId, ...view });
    else if (format === "pass") renderPass(ctx, { photo, themeId, name, role, title, ...view });
    else renderSquad(ctx, { members, themeId, team });
  }, [format, themeId, photo, view, name, role, title, members, team]);

  useEffect(() => {
    void draw();
  }, [draw]);

  // any edit invalidates the link we uploaded last time, and any upload in flight
  useEffect(() => {
    setShared("");
    uploading.current = null;
  }, [format, themeId, photo, view, name, role, title, members, team]);

  async function take(file: File | undefined | null) {
    if (!file) return;
    setError("");
    setBusy("photo");
    try {
      const bitmap = await decode(file);
      setPhoto((old) => {
        old?.close?.();
        return bitmap;
      });
      const start = { zoom: 1, ...focalPoint(bitmap) };
      setAutoView(start);
      setView(start);
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "Could not read that photo. Try a JPG or PNG.");
    } finally {
      setBusy(null);
    }
  }

  async function addMembers(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy("photo");
    const room = MAX_MEMBERS - members.length;
    const picked = [...files].slice(0, Math.max(0, room));

    for (const file of picked) {
      try {
        const photoBitmap = await decode(file);
        const id = crypto.randomUUID();
        setMembers((m) => [...m, { id, photo: photoBitmap, name: "", focus: focalPoint(photoBitmap) }]);
        setThumbs((t) => ({ ...t, [id]: URL.createObjectURL(file) }));
      } catch (e) {
        setError(e instanceof ImageError ? e.message : `Skipped ${file.name}.`);
      }
    }
    if (files.length > room) setError(`Six builders max, so I kept the first ${MAX_MEMBERS}.`);
    setBusy(null);
  }

  function dropMember(id: string) {
    setMembers((m) => {
      m.find((x) => x.id === id)?.photo?.close?.();
      return m.filter((x) => x.id !== id);
    });
    setThumbs((t) => {
      URL.revokeObjectURL(t[id]);
      const next = { ...t };
      delete next[id];
      return next;
    });
  }

  function renameMember(id: string, value: string) {
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, name: value } : x)));
  }

  function pan(dx: number, dy: number) {
    if (!photo || isSquad) return;
    setView((v) => ({ ...v, fx: clamp(v.fx - dx * 1.4), fy: clamp(v.fy - dy * 1.4) }));
  }

  function zoomBy(factor: number) {
    if (!photo || isSquad) return;
    setView((v) => ({ ...v, zoom: clamp(v.zoom * factor, 1, 3) }));
  }

  /**
   * Jpeg rather than png here: the share images only ever get looked at, and
   * 300KB over a phone connection beats a megabyte. The download stays lossless.
   */
  async function buildBlobs() {
    const canvas = canvasRef.current!;
    const card = await canvasToBlob(canvas, "image/jpeg", 0.92);

    const og = document.createElement("canvas");
    og.width = OG_W;
    og.height = OG_H;
    const ctx = og.getContext("2d")!;
    if (format === "frame") renderOgFrame(ctx, canvas, themeId, name);
    else renderOgWide(ctx, canvas, themeId);

    return { card, og: await canvasToBlob(og, "image/jpeg", 0.92) };
  }

  const captionText = () => caption(format, { name, title, team, count: members.length });
  const slug = isSquad ? team : name;

  async function download() {
    setBusy("download");
    try {
      const blob = await canvasToBlob(canvasRef.current!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(format, slug);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setError("Download failed. Long press the image to save it instead.");
    } finally {
      setBusy(null);
    }
  }

  async function shareToX() {
    setError("");
    setNotice("");

    const viaFile = canShareFiles();
    let tab: Window | null = null;
    setBusy("share");
    try {
      if (viaFile && (await shareFile())) {
        setNotice("Pick X in the sheet and the image goes with the post.");
        return;
      }

      // No file sharing here, so put the image on the clipboard to paste in.
      // This has to run before the tab is opened: opening one takes focus away
      // and the clipboard write then fails with "Document is not focused".
      const pasteable = await copyImage();

      // Still inside the click's transient activation, so it is not blocked as a
      // popup, and it happens before the slow upload below.
      tab = window.open("", "_blank");
      const url = await ensureShareLink();
      const intent = intentUrl(captionText(), url);
      if (tab) tab.location.href = intent;
      else window.location.href = intent;

      setNotice(
        pasteable
          ? `Image copied. Press ${modKey()} + V in the post to attach it.`
          : "Post opened. Use Download, then drag the image into the post.",
      );
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "Could not open X. Download the image and post it manually.");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Idempotent, so pressing the button can kick the upload off early and the
   * click itself then has nothing left to wait for.
   */
  function ensureShareLink() {
    if (shared) return Promise.resolve(shared);
    if (!uploading.current) {
      uploading.current = (async () => {
        const { card, og } = await buildBlobs();
        const body = new FormData();
        body.append("card", card, "card.jpg");
        body.append("og", og, "og.jpg");
        const res = await fetch("/api/share", { method: "POST", body });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Upload failed");
        const { path } = (await res.json()) as { path: string };
        const url = `${window.location.origin}${path}`;
        setShared(url);
        return url;
      })().catch((e) => {
        uploading.current = null; // let the next attempt retry
        throw e;
      });
    }
    return uploading.current;
  }

  /**
   * Hands the real image file to the OS sheet, which is the only way an image
   * ends up genuinely attached to the post. Returns false if this device cannot
   * do it, so the caller can fall back to the link.
   */
  async function shareFile() {
    const blob = await canvasToBlob(canvasRef.current!, "image/jpeg", 0.95);
    const file = new File([blob], fileName(format, slug).replace(/\.png$/, ".jpg"), {
      type: "image/jpeg",
    });
    if (!navigator.canShare?.({ files: [file] })) return false;

    try {
      await navigator.share({
        files: [file],
        text: `${captionText()}\n\n${window.location.origin}`,
      });
      return true;
    } catch (e) {
      // dismissing the sheet is not a failure worth falling through for
      if ((e as Error)?.name === "AbortError") return true;
      return false;
    }
  }

  /**
   * X strips images from web intents, so the next best thing on desktop is to
   * put the png on the clipboard: one paste in the composer and it is attached.
   * Passing the promise to ClipboardItem is what keeps Safari's user gesture alive.
   */
  async function copyImage() {
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") return false;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": canvasToBlob(canvasRef.current!, "image/png") }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(captionText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  const hasArt = isSquad ? members.length > 0 : Boolean(photo);

  return (
    <div className="min-h-dvh">
      <TopBar />

      <header className="mx-auto w-full max-w-[1180px] px-5 pt-10 pb-8 sm:pt-16">
        <p className="eyebrow">Build This · Task #01</p>
        <div className="relative mt-3 inline-block">
          <h1 className="title text-[clamp(3rem,12vw,7.5rem)]">Frame In Goa</h1>
          <span
            className="serif absolute -top-3 -right-6 rotate-[-12deg] rounded-full bg-pink px-3 py-1 text-[13px] font-bold text-white sm:-right-10"
            style={{ boxShadow: "0 0 0 3px #FEE101" }}
          >
            गोवा
          </span>
        </div>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed opacity-85">
          Drop A Photo. Pick A Format. Walk Out With A Hacker House Goa 2026 Profile Picture, A Builder
          Pass, Or One Frame With Your Whole Squad In It. No Login, No Cropping, No Waiting.
        </p>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 pb-16">
        <div className="panel p-5 sm:p-9">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow eyebrow-green">The Generator</p>
              <h2 className="title mt-1 text-[clamp(1.7rem,4vw,2.6rem)]">Make Yours</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`pill ${format === f.value ? "pill-pink" : "pill-line"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* controls come first on a phone so the upload button is not below the fold */}
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="order-2 lg:order-1">
              <div className={`mx-auto w-full ${format === "frame" ? "max-w-[430px]" : "max-w-[700px]"}`}>
                <Stage
                  canvasRef={canvasRef}
                  ratio={format === "frame" ? "1 / 1" : "16 / 9"}
                  enabled={Boolean(photo) && !isSquad}
                  onPan={pan}
                  onZoom={zoomBy}
                />
              </div>

              <p className="mt-2 text-center text-[12px] text-green/60 lg:text-left">
                {isSquad
                  ? "Everyone gets auto centred. Add up to six builders."
                  : photo
                    ? "Drag the photo to reposition, pinch or scroll to zoom."
                    : FORMATS.find((f) => f.value === format)?.blurb}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className="pill pill-pink" onClick={download} disabled={busy !== null}>
                  {busy === "download" ? "Saving" : "Download"}
                </button>
                <button
                  className="pill pill-green"
                  onClick={shareToX}
                  // start uploading on press, so by the time the click lands the
                  // link usually already exists
                  onPointerDown={() => {
                    if (!fileShare && hasArt) void ensureShareLink().catch(() => {});
                  }}
                  disabled={busy !== null}
                >
                  {busy === "share" ? "Preparing" : "Share To X"}
                </button>
                {!fileShare && (
                  <button
                    className="pill pill-line"
                    onClick={async () => {
                      setError("");
                      setNotice(
                        (await copyImage())
                          ? `Image copied. Paste it into your post with ${modKey()} + V.`
                          : "This browser will not copy images. Use Download instead.",
                      );
                    }}
                    disabled={busy !== null}
                  >
                    Copy Image
                  </button>
                )}
                <button className="pill pill-line" onClick={copyCaption} disabled={busy !== null}>
                  {copied ? "Copied" : "Copy Caption"}
                </button>
              </div>

              {error && (
                <p className="rise mt-3 rounded-lg border border-pink bg-pink/10 px-3 py-2 text-[13px] text-pink">
                  {error}
                </p>
              )}

              {notice && (
                <p className="rise mt-3 rounded-lg border border-green/40 bg-green/10 px-3 py-2 text-[13px] font-bold text-green">
                  {notice}
                </p>
              )}

              {shared && (
                <p className="rise mt-3 text-[12px] text-green/70">
                  Share link:{" "}
                  <a className="text-pink underline underline-offset-4" href={shared}>
                    {shared.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              )}

              {!hasArt && (
                <p className="mt-3 text-[12px] text-green/55">
                  That is a live preview. Add a photo and it updates instantly.
                </p>
              )}
            </section>

            <aside className="order-1 space-y-5 lg:order-2">
              {!isSquad ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    void take(e.dataTransfer.files?.[0]);
                  }}
                  className={`rounded-lg border border-dashed p-4 text-center transition-colors ${
                    dragging ? "border-pink bg-pink/5" : "border-green/35"
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                      void take(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    className="pill pill-pink w-full"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy === "photo"}
                  >
                    {busy === "photo" ? "Reading" : photo ? "Change Photo" : "Upload A Photo"}
                  </button>
                  <p className="mt-2 text-[11px] text-green/60">
                    JPG, PNG, WebP or HEIC. Everything happens in your browser.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-green/35 p-4">
                  <input
                    ref={squadRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void addMembers(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    className="pill pill-pink w-full"
                    onClick={() => squadRef.current?.click()}
                    disabled={busy === "photo" || members.length >= MAX_MEMBERS}
                  >
                    {busy === "photo" ? "Reading" : members.length ? "Add More" : "Add Builders"}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-green/60">
                    {members.length}/{MAX_MEMBERS} added. Pick several photos at once.
                  </p>

                  {members.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {members.map((m, i) => (
                        <li key={m.id} className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbs[m.id]}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-green/30 object-cover"
                          />
                          <input
                            className="field py-1.5 text-[13px]"
                            placeholder={`Builder ${i + 1}`}
                            maxLength={16}
                            value={m.name}
                            onChange={(e) => renameMember(m.id, e.target.value)}
                          />
                          <button
                            className="shrink-0 px-2 text-[16px] leading-none text-green/50 hover:text-pink"
                            onClick={() => dropMember(m.id)}
                            aria-label="Remove builder"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {photo && !isSquad && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label">Zoom</span>
                    <button className="text-[11px] text-pink underline underline-offset-4" onClick={() => setView(autoView)}>
                      reset
                    </button>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={view.zoom}
                    onChange={(e) => setView((v) => ({ ...v, zoom: Number(e.target.value) }))}
                  />
                </div>
              )}

              {format === "pass" && (
                <div className="space-y-3">
                  <Field label="Name" id="name">
                    <input
                      id="name"
                      className="field"
                      value={name}
                      maxLength={28}
                      placeholder="Your name"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field label="Stack or role" id="role">
                    <input
                      id="role"
                      className="field"
                      value={role}
                      maxLength={36}
                      placeholder="Next.js · Solidity · too much coffee"
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </Field>
                  <div>
                    <span className="label mb-1 block">Builder class</span>
                    <div className="flex items-center gap-2">
                      <div className="field flex-1 truncate">{title}</div>
                      <button className="pill pill-line px-4 py-2 text-[12px]" onClick={() => setNudge((n) => n + 1)}>
                        Reroll
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isSquad && (
                <Field label="Team name" id="team">
                  <input
                    id="team"
                    className="field"
                    value={team}
                    maxLength={22}
                    placeholder="Team name"
                    onChange={(e) => setTeam(e.target.value)}
                  />
                </Field>
              )}

              <div>
                <span className="label mb-2 block">Colourway</span>
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      className={`rounded-lg border p-2 text-left transition-colors ${
                        themeId === t.id ? "border-pink" : "border-green/25"
                      }`}
                    >
                      <span className="flex gap-1">
                        <i className="h-4 w-4 rounded-full border border-green/20" style={{ background: t.bg }} />
                        <i className="h-4 w-4 rounded-full border border-green/20" style={{ background: t.band }} />
                        <i className="h-4 w-4 rounded-full border border-green/20" style={{ background: t.accent }} />
                      </span>
                      <span className="mt-1 block text-[10px] text-green/70">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <Checklist />
      </main>

      <SiteFooter />
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label mb-1 block" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TopBar() {
  return (
    <div className="border-b border-cream/15">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-4">
        <p className="text-[11px] tracking-[0.18em] opacity-80 sm:text-[13px]">
          {EVENT.place} · 28 – 31 OCT 2026
        </p>
        <a
          className="pill pill-yellow px-4 py-2 text-[12px]"
          href="https://hhgoa.com"
          target="_blank"
          rel="noreferrer"
        >
          hhgoa.com ↗
        </a>
      </div>
    </div>
  );
}

const POINTS = [
  "Instantly recognisable HH Goa 2026 identity",
  "One click download, one click share to X",
  "Works on any photo, no manual cropping",
  "Personalised name, stack and builder class",
  "Seconds from upload to shareable output",
  "Your whole team in one combined frame",
];

function Checklist() {
  return (
    <section className="mt-12">
      <p className="eyebrow">Why It Works</p>
      <h2 className="title mt-1 text-[clamp(1.7rem,4vw,2.6rem)]">Built To The Brief</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {POINTS.map((p) => (
          <li key={p} className="flex items-start gap-3 text-[14px] opacity-90">
            <span className="mt-0.5 text-yellow">✦</span>
            {p}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="relative mt-8 overflow-hidden border-t border-cream/15">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[11px] tracking-[0.14em] uppercase opacity-70">
        <span>© 2026 Frame In Goa · {EVENT.tagline}</span>
        <span>{EVENT.hashtag}</span>
      </div>
      <p className="mx-auto w-full max-w-[1180px] px-5 pb-8 text-[11px] opacity-45">
        Community build for Task #01. Not an official HH Goa page. Photos stay in your browser until you
        press Share To X.
      </p>
    </footer>
  );
}

function clamp(v: number, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Whether handing the file to the OS sheet will actually reach X.
 *
 * Capability alone is the wrong test. Chrome on macOS happily reports it can
 * share files, but the sheet it opens is Mail / Messages / AirDrop with no X in
 * it, which is a dead end. X is only a share target on a phone, so this checks
 * the device as well. Everything else gets the clipboard and the web intent.
 */
function canShareFiles() {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  if (!isHandheld()) return false;
  try {
    const probe = new File([new Uint8Array([0xff, 0xd8, 0xff])], "probe.jpg", { type: "image/jpeg" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

function isHandheld() {
  const ua = navigator.userAgent;
  const hint = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof hint?.mobile === "boolean") return hint.mobile;
  if (/Android|iPhone|iPod|iPad/i.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac, so touch points are the giveaway
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function modKey() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}
