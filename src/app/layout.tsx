import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Focus Friend - ADHD Assistant :3",
  description: "A playful, gamified ADHD life management assistant. Track tasks, goals, finances, and more with a cute gaming aesthetic!",
  keywords: ["ADHD", "productivity", "tasks", "goals", "finance", "AI assistant", "gaming"],
  authors: [{ name: "Focus Friend Team" }],
  icons: {
    icon: "/logo.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Focus Friend - ADHD Assistant",
    description: "Your cute AI companion for organizing life with ADHD! :3",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="neon-gamer-theme">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
