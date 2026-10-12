import { LoaderCircle } from "./icons";

const VARIANTS = {
  primary:
    "bg-brand-blue text-white hover:bg-sky-500 focus-visible:ring-brand-blue/50",
  navy: "bg-brand-navy text-white hover:bg-[#16304f] focus-visible:ring-brand-navy/40",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/40",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40",
  ghost: "text-slate-600 hover:bg-slate-100",
};

const SIZES = {
  // Ukuran md dan lg memenuhi tinggi sasaran sentuh minimal (~44px).
  sm: "px-3 py-1.5 text-sm",
  md: "min-h-[2.75rem] px-4 py-2 text-sm",
  lg: "min-h-[3rem] px-5 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        VARIANTS[variant] ?? VARIANTS.primary
      } ${SIZES[size] ?? SIZES.md} ${className}`}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
