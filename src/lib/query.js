/**
 * Membaca & memvalidasi query string halaman daftar (search, filter, paginasi).
 * Nilai yang tidak valid selalu jatuh ke nilai default yang aman.
 */

import { DEFAULT_PAGE_SIZE } from "./constants";
import { listQuerySchema, parseWith } from "./validation";

const QUERY_KEYS = [
  "q",
  "page",
  "pageSize",
  "status",
  "paymentStatus",
  "from",
  "to",
];

const FALLBACK = {
  q: "",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  status: "",
  paymentStatus: "",
  from: "",
  to: "",
};

export function readListQuery(searchParams = {}) {
  const source = {};
  for (const key of QUERY_KEYS) {
    const value = searchParams?.[key];
    if (value === undefined || value === null) continue;
    source[key] = Array.isArray(value) ? value[0] : value;
  }

  const parsed = parseWith(listQuerySchema, source);
  return parsed.ok ? parsed.data : { ...FALLBACK };
}

/** Objek query untuk dipertahankan pada tautan paginasi. */
export function paginationQuery(query) {
  return {
    q: query.q,
    pageSize: query.pageSize,
    status: query.status,
    paymentStatus: query.paymentStatus,
    from: query.from,
    to: query.to,
  };
}
