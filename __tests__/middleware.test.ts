import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// We cannot use the real NextRequest easily in tests, so we build a
// minimal duck-typed object that satisfies the middleware contract.
function makeReq(urlStr: string, host: string) {
  const url = new URL(urlStr);
  return {
    headers: new Headers({ host }),
    nextUrl: {
      ...url,
      pathname: url.pathname,
      searchParams: url.searchParams,
      clone() {
        // Return a mutable URL copy that middleware can modify
        return new URL(url.toString());
      },
    },
  } as any;
}

// Import after helpers are defined
import { middleware } from "../middleware";

describe("Middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rewrites subdomain to /site/[slug]", () => {
    const req = makeReq("http://acme.flashlocal.com/", "acme.flashlocal.com");
    const res = middleware(req);
    // NextResponse.rewrite returns a Response whose url we can check
    expect(res).toBeDefined();
    // The rewrite should target /site/acme/
    expect(res.headers.get("x-middleware-rewrite")).toContain("/site/acme/");
  });

  it("uses ?tenant= query param as fallback", () => {
    const req = makeReq("http://localhost:3000/?tenant=acme", "localhost:3000");
    const res = middleware(req);
    expect(res.headers.get("x-middleware-rewrite")).toContain("/site/acme/");
  });

  it("ignores www subdomain", () => {
    const req = makeReq("http://www.flashlocal.com/", "www.flashlocal.com");
    const res = middleware(req);
    // Should pass through (NextResponse.next()), no rewrite header
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("passes through API routes", () => {
    const req = makeReq("http://acme.flashlocal.com/api/health", "acme.flashlocal.com");
    const res = middleware(req);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("passes through _next routes", () => {
    const req = makeReq("http://acme.flashlocal.com/_next/data/build.json", "acme.flashlocal.com");
    const res = middleware(req);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
