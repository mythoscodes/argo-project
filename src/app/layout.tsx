import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
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
  title: {
    default: "Argos — AI 실시간 수업 분석",
    template: "%s | Argos",
  },
  description: "100개의 눈으로 교실을 본다. AI가 수강생 이해도를 실시간 분석하고 강사에게 코칭을 제공합니다.",
  keywords: ["AI", "교육", "실시간 분석", "이해도", "코리아IT아카데미", "퀴즈", "코칭"],
  authors: [{ name: "Team mythos" }],
  openGraph: {
    title: "Argos — AI 실시간 수업 분석 플랫폼",
    description: "100개의 눈으로 교실을 본다. IT 강사의 눈이 닿지 않는 곳을 AI가 봅니다.",
    type: "website",
    locale: "ko_KR",
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
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
