import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { DotGridBackground } from "@/components/DotGridBackground";
import { AppNav } from "@/components/AppNav";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const mono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Studdy Buddy",
  description: "Syllabus parser + bento dashboard + calendar sync",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} antialiased text-slate-900`}>
        <div className="relative min-h-screen">
          <DotGridBackground />
          <AppNav />
          <main className="relative mx-auto w-full max-w-6xl px-6 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
