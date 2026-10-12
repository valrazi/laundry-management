/**
 * Input memakai ukuran font 16px pada layar kecil agar browser ponsel
 * (terutama iOS Safari) tidak memperbesar halaman secara otomatis saat input
 * difokuskan. Ukuran font dikecilkan kembali pada layar >= md.
 */
export const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/25 disabled:cursor-not-allowed disabled:bg-slate-100 md:py-2 md:text-sm";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className = "",
  children,
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
          {required ? <span className="text-rose-600"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return <input {...props} className={`${inputClass} ${className}`} />;
}

export function Textarea({ className = "", rows = 4, ...props }) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={`${inputClass} resize-y ${className}`}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select {...props} className={`${inputClass} pr-8 ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({ className = "", ...props }) {
  return (
    <input
      type="checkbox"
      {...props}
      className={`h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/40 ${className}`}
    />
  );
}
