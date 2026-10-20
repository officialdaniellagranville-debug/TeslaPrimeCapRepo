import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";
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
  title: "Tesla Prime Capital | Investment & Wealth Management",
  description: "Tesla Prime Capital — Secure online banking, Tesla vehicle investments, and wealth management platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full min-h-[100dvh] bg-zinc-950 text-white overflow-x-hidden">
        {children}
        <ChatWidgetLoader />
      </body>
    </html>
  );
}