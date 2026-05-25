import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI认知分身协议 · Cognitive Avatar Protocol",
  description: "Web4.0认知所有权基础设施 — 行为即契约 · 记忆即永生 · 共性通神性 · 觉醒即自由",
  keywords: ["AI分身", "认知所有权", "Web4.0", "Cognitive Avatar", "DID", "x402", "流体民主"],
  authors: [{ name: "Piaoshu / Web4.0 Foundation" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "AI认知分身协议",
    description: "Web4.0认知所有权基础设施",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI认知分身协议",
    description: "Web4.0认知所有权基础设施",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
