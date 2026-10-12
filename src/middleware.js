import { NextResponse } from "next/server";

/**
 * Middleware HANYA untuk pengalaman pengguna (redirect cepat):
 * - mengarahkan pengunjung tanpa cookie session ke pintu masuk yang sesuai
 *   (pelanggan -> /login, admin -> /admin/login)
 * - mengarahkan pengguna yang sudah login menjauh dari halaman login/registrasi
 *
 * Middleware TIDAK dipakai sebagai pengaman. Karena berjalan pada Edge Runtime,
 * ia tidak dapat memvalidasi session ke database. Seluruh pemeriksaan otorisasi
 * yang sesungguhnya dilakukan di server: layout, Server Action, dan Route
 * Handler (lihat src/lib/auth.js).
 */

const SESSION_COOKIE_NAME = "laundry_session";

/** Halaman login/registrasi — bukan halaman yang dilindungi. */
const AUTH_ROUTES = ["/login", "/register", "/admin/login"];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  const isProtectedRoute =
    !isAuthRoute &&
    (pathname.startsWith("/admin") || pathname.startsWith("/customer"));

  if (isProtectedRoute && !hasSessionCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.startsWith("/admin")
      ? "/admin/login"
      : "/login";
    redirectUrl.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && hasSessionCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/customer/:path*",
    "/login",
    "/register",
  ],
};
