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
          <div className="relative flex min-h-screen flex-col">
            <AppNav />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </main>
            <footer className="mx-auto w-full max-w-6xl px-6 pb-10">
              <div className="flex flex-col items-start justify-between gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center">
                <p>© {new Date().getFullYear()} Study Buddy</p>
                <div className="flex flex-wrap items-center gap-4">
                  <a href="/privacy" className="hover:text-slate-900">
                    Privacy Policy
                  </a>
                  <a href="/terms" className="hover:text-slate-900">
                    Terms
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
