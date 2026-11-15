import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          // Prevent CDNs from caching responses that carry auth cookies.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // API routes enforce their own auth (getUser / CRON_SECRET); the proxy only
  // refreshes the session cookies and must never redirect them.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // Legacy marketing URL → home (LP)
  if (pathname === "/landing" || pathname.startsWith("/landing/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
  const isInvitePage = pathname.startsWith("/invite/");
  const isPublicMarketing = pathname === "/";

  if (
    !user &&
    !isAuthPage &&
    !isInvitePage &&
    !isPublicMarketing &&
    !isAuthRoute
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname + request.nextUrl.search);
    const redirectResponse = NextResponse.redirect(url);
    // Carry refreshed cookies/headers onto the redirect.
    supabaseResponse.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    supabaseResponse.headers.forEach((value, key) => {
      if (/^(cache-control|expires|pragma)$/i.test(key)) redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // Logged-in users skip the marketing home and go straight to the app
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js$|manifest\\.webmanifest$|robots\\.txt$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
