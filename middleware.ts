import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "flashlocal.com";

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl.clone();

  // Skip API routes and static files (but still allow auth refresh to run)
  const isApiOrStatic =
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon");

  // --- Tenant routing (subdomain → /site/<slug>/*) ---
  const hostParts = host.split(".");
  const isSubdomain =
    hostParts.length > 2 ||
    (hostParts.length === 2 && !host.includes("localhost"));

  let tenantSlug: string | null = null;

  if (isSubdomain) {
    const sub = hostParts[0];
    if (sub !== "www") {
      tenantSlug = sub;
    }
  }

  if (!tenantSlug && url.searchParams.has("tenant")) {
    tenantSlug = url.searchParams.get("tenant");
  }

  if (
    !isApiOrStatic &&
    tenantSlug &&
    !url.pathname.startsWith("/site/")
  ) {
    url.pathname = `/site/${tenantSlug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Skip auth refresh for API routes and static files
  if (isApiOrStatic) {
    return NextResponse.next();
  }

  // --- Auth session refresh + route guards ---
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            req.cookies.set(name, value)
          );
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }: {
              name: string;
              value: string;
              options: CookieOptions;
            }) => response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session (required for SSR cookie-based auth)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Capture referral code into cookie ---
  const refCode = url.searchParams.get("ref");
  if (refCode && !req.cookies.get("fl_ref")) {
    response.cookies.set("fl_ref", refCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  // Guard protected routes
  const protectedPrefixes = ["/dashboard", "/start", "/rep"];
  const isProtected = protectedPrefixes.some((p) =>
    url.pathname.startsWith(p)
  );

  if (isProtected && !user) {
    const loginUrl = url.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public image extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
