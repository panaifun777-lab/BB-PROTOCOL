import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.bbprotocol.xyz";

export const viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BB Protocol — Cognitive Avatar Protocol | Web4.0 Infrastructure",
    template: "%s | BB Protocol",
  },
  description:
    "Web4.0 Cognitive Ownership Infrastructure — Build AI-powered cognitive avatars as on-chain digital twins. Behavior as Contract, Memory as Eternity, Resonance as Divinity, Awakening as Freedom.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BB Protocol",
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [
    "AI Avatar",
    "Cognitive Avatar",
    "Web4.0",
    "Cognitive Ownership",
    "DeFi",
    "Base L2",
    "DID",
    "x402",
    "Fluid Democracy",
    "Resonance Score",
    "Smart Contract",
    "DAO Governance",
    "Multi-chain",
    "On-chain AI",
    "Digital Twin",
    "ERC-721",
    "Micro-payment",
    "Intent-Followed-Protocol",
    "Blockchain",
    "Web3",
  ],
  authors: [{ name: "Piaoshu / Web4.0 Foundation", url: SITE_URL }],
  creator: "BB Protocol Team",
  publisher: "Web4.0 Foundation",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: "BB Protocol",
    title: "BB Protocol — Cognitive Avatar Protocol",
    description:
      "Web4.0 Cognitive Ownership Infrastructure — Build AI-powered cognitive avatars as on-chain digital twins",
  },
  twitter: {
    card: "summary_large_image",
    title: "BB Protocol — Cognitive Avatar Protocol",
    description:
      "Web4.0 Cognitive Ownership Infrastructure — AI cognitive avatars on-chain",
  },
  icons: {
    icon: "/logo.svg",
  },
};

function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "BB Protocol",
        alternateName: "Cognitive Avatar Protocol",
        url: SITE_URL,
        description:
          "Web4.0 Cognitive Ownership Infrastructure — AI-powered cognitive avatars as on-chain digital twins with resonance scoring, fluid democracy delegation, and micro-payment skill unlocking.",
        applicationCategory: "BlockchainApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript. Requires Web3 wallet.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Cognitive Avatar Creation",
          "On-chain Identity (DID)",
          "Resonance Score Computation",
          "IFP Fluid Democracy Delegation",
          "x402 Micro-payment Protocol",
          "Multi-chain Deployment",
          "DAO Governance",
          "Revenue Split Dashboard",
          "Skill Vault System",
          "Security Audit Monitoring",
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: "BB Protocol Dashboard",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        programmingLanguage: "TypeScript",
        runtimePlatform: "Next.js 16",
      },
      {
        "@type": "Organization",
        name: "Web4.0 Foundation",
        alternateName: "BB Protocol Team",
        url: SITE_URL,
        description: "Building Web4.0 Cognitive Ownership Infrastructure",
      },
      {
        "@type": "Blockchain",
        name: "Base L2",
        description:
          "Ethereum Layer 2 blockchain for BB Protocol smart contracts",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <head>
        <JsonLd />
        <link rel="canonical" href={SITE_URL} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
