import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScoreLive AI 棒球直播極速記分雲",
  description: "YouTube 棒球直播極速自動記分 Web Service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}