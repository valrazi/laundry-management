import {
  AlertCircle,
  CheckCircle2,
  Info,
} from "./icons";

const TONES = {
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-800",
    Icon: CheckCircle2,
  },
  error: {
    wrap: "border-rose-200 bg-rose-50 text-rose-800",
    Icon: AlertCircle,
  },
  info: {
    wrap: "border-sky-200 bg-sky-50 text-sky-800",
    Icon: Info,
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900",
    Icon: AlertCircle,
  },
};

export default function Alert({
  variant = "info",
  title,
  children,
  className = "",
}) {
  const tone = TONES[variant] ?? TONES.info;
  const Icon = tone.Icon;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${tone.wrap} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}
