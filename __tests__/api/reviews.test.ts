import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase mock -----------------------------------------------------------
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// --- Env vars ----------------------------------------------------------------
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key";

// --- Import handlers after mocks ---------------------------------------------
import { GET, POST } from "../../app/api/reviews/route";

// --- Helpers -----------------------------------------------------------------
function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/reviews");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // NextRequest uses nextUrl.searchParams
  return { nextUrl: url } as any;
}

function makePostRequest(body: any) {
  return new Request("http://localhost/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

function selectChain(data: any, error: any = null) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue({ data, error });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

function insertChain(data: any, error: any = null) {
  const chain: any = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

// --- Tests -------------------------------------------------------------------
describe("Reviews API — GET", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns reviews with aggregate stats", async () => {
    const reviews = [
      { id: "1", customer_name: "Alice", rating: 5, body: "Great", source: "platform", created_at: "2026-01-01" },
      { id: "2", customer_name: "Bob", rating: 3, body: "OK", source: "platform", created_at: "2026-01-02" },
    ];

    const chain = selectChain(reviews);
    mockFrom.mockReturnValue(chain);

    const res = await GET(makeGetRequest({ provider_id: "prov_1" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.reviews).toHaveLength(2);
    expect(json.stats.count).toBe(2);
    expect(json.stats.average_rating).toBe(4); // (5+3)/2 = 4.0
  });

  it("returns 400 when provider_id is missing", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/provider_id/i);
  });
});

describe("Reviews API — POST", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePostRequest({ rating: 5 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required fields/i);
  });

  it("rejects rating of 0", async () => {
    const res = await POST(
      makePostRequest({ provider_id: "p1", customer_name: "A", rating: 0 })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/rating/i);
  });

  it("rejects rating of 6", async () => {
    const res = await POST(
      makePostRequest({ provider_id: "p1", customer_name: "A", rating: 6 })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/rating/i);
  });

  it("creates a review with valid data", async () => {
    const chain = insertChain({ id: "rev_1" });
    mockFrom.mockReturnValue(chain);

    const res = await POST(
      makePostRequest({ provider_id: "p1", customer_name: "Alice", rating: 5, body: "Excellent" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.review_id).toBe("rev_1");
  });

  it("completes review request when valid token provided", async () => {
    // First call: review_requests select (token lookup)
    const reqChain: any = {};
    reqChain.select = vi.fn().mockReturnValue(reqChain);
    reqChain.eq = vi.fn().mockReturnValue(reqChain);
    reqChain.single = vi.fn().mockResolvedValue({
      data: { id: "rr_1", provider_id: "p1", booking_id: "b1", status: "PENDING" },
      error: null,
    });

    // Second call: review_requests update
    const updateChain: any = {};
    updateChain.update = vi.fn().mockReturnValue(updateChain);
    updateChain.eq = vi.fn().mockResolvedValue({ data: null, error: null });

    // Third call: reviews insert
    const insChain = insertChain({ id: "rev_2" });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return reqChain;
      if (callCount === 2) return updateChain;
      return insChain;
    });

    const res = await POST(
      makePostRequest({ provider_id: "p1", customer_name: "Bob", rating: 4, token: "tok_valid" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.review_id).toBe("rev_2");
  });

  it("returns 400 when token is invalid or expired", async () => {
    const reqChain: any = {};
    reqChain.select = vi.fn().mockReturnValue(reqChain);
    reqChain.eq = vi.fn().mockReturnValue(reqChain);
    reqChain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });

    mockFrom.mockReturnValue(reqChain);

    const res = await POST(
      makePostRequest({ provider_id: "p1", customer_name: "Eve", rating: 3, token: "tok_expired" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid|expired/i);
  });
});
