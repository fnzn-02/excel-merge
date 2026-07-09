import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/app/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "뚝딱 - 반복 업무를 빠르게 끝내는 도구모음",
  description: "엑셀 병합 등 반복적인 사무 작업을 서버 업로드 없이 브라우저에서 바로 처리하는 무료 도구모음",
  verification: {
    google: "U0L4_r3h79hcs-sFF72Ss6LM4awIpPG3ehgR1FRPtyQ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
