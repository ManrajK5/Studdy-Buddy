import { cn } from "@/lib/utils";

export function BentoCard({
  title,
  subtitle,
  right,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-3xl border border-slate-100 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </header>
      <div className="min-h-0 flex-1 px-6 pb-6 pt-4">{children}</div>
    </section>
  );
}
