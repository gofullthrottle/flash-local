import { NextRequest, NextResponse } from "next/server";

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "flashlocal.com";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl.clone();

  // Skip API routes and static files
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Tenant routing: <slug>.flashlocal.com → /site/<slug>/*
  // In local dev, use ?tenant=<slug> query param as fallback
  const hostParts = host.split(".");
  const isSubdomain =
    hostParts.length > 2 ||
    (hostParts.length === 2 && !host.includes("localhost"));

  let tenantSlug: string | null = null;

  if (isSubdomain) {
    const sub = hostParts[0];
    // Ignore www
    if (sub !== "www") {
      tenantSlug = sub;
    }
  }

  // Dev fallback: ?tenant=slug
  if (!tenantSlug && url.searchParams.has("tenant")) {
    tenantSlug = url.searchParams.get("tenant");
  }

  // If tenant detected and not already on /site/* path, rewrite
  if (tenantSlug && !url.pathname.startsWith("/site/")) {
    url.pathname = `/site/${tenantSlug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
