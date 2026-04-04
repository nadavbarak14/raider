import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistStorage } from "@/components/PersistStorage";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1a1a1a",
};

export const metadata: Metadata = {
  title: "AI Book Companion",
  description:
    "Read public domain classics with an AI companion. No sign-up required — just tap and read.",
  applicationName: "AI Book Companion",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BookAI",
  },
  openGraph: {
    type: "website",
    title: "AI Book Companion",
    description:
      "Read public domain classics with a spoiler-free AI companion. No sign-up required.",
    siteName: "AI Book Companion",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <PersistStorage />
      </body>
    </html>
  );
}
