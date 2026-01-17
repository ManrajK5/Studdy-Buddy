export function DotGridBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-slate-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,theme(colors.slate.200)_1px,transparent_0)] opacity-40 [background-size:22px_22px]" />
    </div>
  );
}
