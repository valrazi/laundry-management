"use client";

/**
 * Tombol submit yang meminta konfirmasi sebelum mengirim form.
 * Dipakai untuk aksi penting / destruktif (menolak, membatalkan, logout, dll).
 * Konfirmasi hanya lapisan UX — otorisasi tetap diperiksa di server.
 */
export default function ConfirmButton({
  message = "Lanjutkan aksi ini?",
  className = "",
  variant = "danger",
  size = "sm",
  children,
}) {
  const variants = {
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    primary: "bg-brand-blue text-white hover:bg-sky-500",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition ${
        variants[variant] ?? variants.danger
      } ${sizes[size] ?? sizes.sm} ${className}`}
    >
      {children}
    </button>
  );
}
