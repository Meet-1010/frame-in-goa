import type { Metadata, Viewport } from "next";
import { Baloo_2, Imbue, Victor_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const imbue = Imbue({
  subsets: ["latin"],
  variable: "--font-imbue",
  axes: ["opsz"],
  display: "swap",
});

const victor = Victor_Mono({
  subsets: ["latin"],
  variable: "--font-victor",
  display: "swap",
});

const baloo = Baloo_2({
  subsets: ["devanagari", "latin"],
  variable: "--font-baloo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Frame in Goa | Hacker House Goa 2026",
  description:
    "Drop a photo, get a Hacker House Goa 2026 profile frame or builder pass. Download it or post it straight to X.",
  openGraph: {
    title: "Frame in Goa | Hacker House Goa 2026",
    description: "Drop a photo, get your HH Goa 2026 frame or builder pass.",
    url: siteUrl(),
    siteName: "Frame in Goa",
    images: ["/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frame in Goa | Hacker House Goa 2026",
    description: "Drop a photo, get your HH Goa 2026 frame or builder pass.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B6839",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${imbue.variable} ${victor.variable} ${baloo.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
