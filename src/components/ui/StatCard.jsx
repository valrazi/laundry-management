export default function StatCard({ label, value, hint, icon: Icon, tone = "navy" }) {
  const tones = {
    navy: "bg-brand-navy/10 text-brand-navy",
    blue: "bg-brand-blue/15 text-sky-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-medium uppercase leading-tight tracking-wide text-slate-500 sm:text-xs">
            {label}
          </p>
          <p className="mt-1.5 text-xl font-semibold leading-tight text-slate-800 sm:text-2xl">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              tones[tone] ?? tones.navy
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
