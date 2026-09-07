import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oscindia.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Open Source Connect India | OSCI",
    template: "%s | Open Source Connect India",
  },
  description:
    "India's premier open-source community connecting contributors, mentors, and innovative projects across the nation.",
  keywords: [
    "open source",
    "India",
    "OSCI",
    "contributors",
    "mentors",
    "open source connect",
    "developer community",
    "open source India",
  ],
  authors: [{ name: "Open Source Connect India" }],

  // Open Graph — Facebook, LinkedIn, Discord, WhatsApp, Telegram, Slack
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Open Source Connect India",
    title: "Open Source Connect India | OSCI",
    description:
      "India's premier open-source community connecting contributors, mentors, and innovative projects across the nation.",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 537,
        alt: "Open Source Connect India — Connecting The World Through Open Source",
        type: "image/png",
      },
    ],
  },

  // Twitter / X Card
  twitter: {
    card: "summary_large_image",
    title: "Open Source Connect India | OSCI",
    description:
      "India's premier open-source community connecting contributors, mentors, and innovative projects across the nation.",
    images: ["/og-image.png"],
  },

  // Additional social hints
  other: {
    "theme-color": "#FF7518",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
