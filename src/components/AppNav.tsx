"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-2xl px-3 py-2 text-sm font-medium transition " +
        (active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
      }
    >
      {label}
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="relative mx-auto w-full max-w-6xl px-6 pt-8">
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            <Image
              src="/studdy-buddy.png"
              alt="Studdy Buddy"
              width={28}
              height={28}
              className="rounded-full"
            />
            Studdy Buddy
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/dashboard" label="Dashboard" active={pathname === "/dashboard"} />
            <NavLink href="/syllabus" label="Syllabus" active={pathname === "/syllabus"} />
            <NavLink href="/tasks" label="Tasks" active={pathname === "/tasks"} />
            <NavLink href="/focus" label="Focus" active={pathname === "/focus"} />
          </nav>
        </div>
        <AuthPanel />
      </div>
    </header>
  );
}
