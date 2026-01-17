export function UsageStats() {
  const items = [
    { label: "Canvas", value: 60, color: "bg-slate-900" },
    { label: "YouTube", value: 30, color: "bg-slate-400" },
    { label: "Reddit", value: 10, color: "bg-slate-200" },
  ];

  return (
    <div>
      <div className="text-xs text-slate-500">Most Used Websites</div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{item.label}</span>
              <span>{item.value}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${item.color}`}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
