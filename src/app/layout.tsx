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
  title: "Study Buddy",
  description: "Syllabus parser + bento dashboard + calendar sync",
  icons: {
    icon: [{ url: "/study-buddy.png", type: "image/png" }],
    apple: [{ url: "/study-buddy.png", type: "image/png" }],
  },
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
          <main className="relative mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
