import { EVENT } from "./brand";

export type Format = "frame" | "pass" | "squad";

export function caption(format: Format, opts: { name?: string; title?: string; team?: string; count?: number }) {
  if (format === "pass") {
    const title = opts.title ? `"${opts.title}"` : "locked in";
    return `Builder pass sorted: ${title}. See you at Hacker House Goa, Oct 28-31.\n\n${EVENT.hashtag}`;
  }
  if (format === "squad") {
    const team = opts.team?.trim();
    const who = team ? team : "The squad";
    return `${who} is coming to Hacker House Goa 2026. Less noise, more signal.\n\n${EVENT.hashtag}`;
  }
  return `New pfp, same plan: Hacker House Goa 2026. Less noise, more signal.\n\n${EVENT.hashtag}`;
}

export function intentUrl(text: string, url: string) {
  const q = new URLSearchParams({ text, url });
  return `https://x.com/intent/post?${q.toString()}`;
}

export function fileName(format: Format, name: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "builder";
  const kind = format === "pass" ? "pass" : format === "squad" ? "squad" : "pfp";
  return `hh-goa-2026-${kind}-${slug}.png`;
}
