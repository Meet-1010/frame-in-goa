import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENT } from "@/lib/brand";
import { absolute } from "@/lib/site";
import { getShare } from "@/lib/store";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const share = await getShare(id);
  if (!share) return { title: "Not found | Frame in Goa" };

  const title = `Hacker House Goa 2026 ${EVENT.hashtag}`;
  const description = "Made with Frame in Goa. Drop a photo, get yours in a few seconds.";
  const image = absolute(share.og);

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const share = await getShare(id);
  if (!share) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center px-4 py-10 text-center">
      <p className="label">
        {EVENT.dates} · {EVENT.place}
      </p>
      <h1 className="font-display text-5xl leading-none sm:text-7xl">Frame in Goa</h1>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={share.card}
        alt="Hacker House Goa 2026 graphic"
        className="mt-6 w-full rounded-2xl border-2 border-cream/25"
      />

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <a className="btn btn-primary" href={share.card} download>
          Download
        </a>
        <Link className="btn btn-secondary" href="/">
          Make your own
        </Link>
      </div>

      <p className="mt-8 text-xs opacity-55">{EVENT.tagline}</p>
    </main>
  );
}
