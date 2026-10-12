import Link from "next/link";

import { ChevronLeft, ChevronRight } from "./icons";

/**
 * Paginasi berbasis URL (server component).
 * `query` dipertahankan sehingga filter & pencarian tidak hilang.
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  total = 0,
  pageSize = 10,
  basePath,
  query = {},
}) {
  if (total === 0) return null;

  const buildHref = (targetPage) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === "" || value === null || value === undefined) continue;
      params.set(key, String(value));
    }
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm">
      <p className="text-slate-500">
        Menampilkan <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> dari{" "}
        <span className="font-medium text-slate-700">{total}</span> data
      </p>

      {totalPages > 1 ? (
        <nav className="flex items-center gap-1" aria-label="Navigasi halaman">
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-300">
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </span>
          )}

          <span className="px-3 text-slate-600">
            Halaman {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100"
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-300">
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
