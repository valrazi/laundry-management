const TONES = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-sky-100 text-sky-800 ring-sky-200",
  success: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-100 text-amber-800 ring-amber-200",
  danger: "bg-rose-100 text-rose-800 ring-rose-200",
  navy: "bg-brand-navy/10 text-brand-navy ring-brand-navy/20",
};

export default function Badge({
  tone = "neutral",
  className = "",
  children,
  title,
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        className || TONES[tone] || TONES.neutral
      }`}
    >
      {children}
    </span>
  );
}
