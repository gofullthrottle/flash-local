import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @supabase/ssr before importing middleware so auth refresh is a no-op
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user" } }, error: null }),
    },
  }),
}));

// We cannot use the real NextRequest easily in tests, so we build a
// minimal duck-typed object that satisfies the middleware contract.
function makeReq(urlStr: string, host: string) {
  const url = new URL(urlStr);
  return {
    headers: new Headers({ host }),
    cookies: {
      getAll: () => [],
      set: () => {},
    },
    nextUrl: {
      ...url,
      pathname: url.pathname,
      searchParams: url.searchParams,
      clone() {
        return new URL(url.toString());
      },
    },
  } as any;
}

// Import after mocks are set up
import { middleware } from "../middleware";

describe("Middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rewrites subdomain to /site/[slug]", async () => {
    const req = makeReq("http://acme.flashlocal.com/", "acme.flashlocal.com");
    const res = await middleware(req);
    expect(res).toBeDefined();
    expect(res!.headers.get("x-middleware-rewrite")).toContain("/site/acme/");
  });

  it("uses ?tenant= query param as fallback", async () => {
    const req = makeReq("http://localhost:3000/?tenant=acme", "localhost:3000");
    const res = await middleware(req);
    expect(res!.headers.get("x-middleware-rewrite")).toContain("/site/acme/");
  });

  it("ignores www subdomain", async () => {
    const req = makeReq("http://www.flashlocal.com/", "www.flashlocal.com");
    const res = await middleware(req);
    // Should pass through (NextResponse.next()), no rewrite header
    expect(res!.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("passes through API routes", async () => {
    const req = makeReq(
      "http://acme.flashlocal.com/api/health",
      "acme.flashlocal.com"
    );
    const res = await middleware(req);
    expect(res!.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("passes through _next routes", async () => {
    const req = makeReq(
      "http://acme.flashlocal.com/_next/data/build.json",
      "acme.flashlocal.com"
    );
    const res = await middleware(req);
    expect(res!.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
