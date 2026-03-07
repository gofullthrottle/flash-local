import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase mock -----------------------------------------------------------
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// --- Stripe mock -------------------------------------------------------------
const mockConstructEvent = vi.fn();
const mockChargesRetrieve = vi.fn();
vi.mock("stripe", () => {
  class StripeMock {
    webhooks = { constructEvent: mockConstructEvent };
    charges = { retrieve: mockChargesRetrieve };
  }
  return { default: StripeMock };
});

// --- Env vars ----------------------------------------------------------------
process.env.STRIPE_SECRET_KEY = "sk_test_fake";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key";

// --- Import handler after mocks ----------------------------------------------
import { POST } from "../../app/api/stripe/webhook/route";

// --- Helpers -----------------------------------------------------------------
function makeRequest(body: string, sig: string | null = "sig_valid") {
  const headers = new Headers();
  if (sig) headers.set("stripe-signature", sig);
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers,
    body,
  }) as any;
}

function chainMock(resolvedData: any = null, resolvedError: any = null) {
  const terminal = { data: resolvedData, error: resolvedError };
  const chain: any = {};
  chain.insert = vi.fn().mockReturnValue(Promise.resolve(terminal));
  chain.update = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(Promise.resolve(terminal));
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(Promise.resolve(terminal));
  chain.single = vi.fn().mockResolvedValue(terminal);
  return chain;
}

// --- Tests -------------------------------------------------------------------
describe("Stripe Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}", null));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/stripe-signature/i);
  });

  it("deduplicates already-processed events", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_dup",
      type: "checkout.session.completed",
      data: { object: {} },
    });

    // Simulate unique-constraint violation (code 23505 = already exists)
    const chain = chainMock(null, { code: "23505" });
    mockFrom.mockReturnValue(chain);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deduped).toBe(true);
  });

  it("creates order and activates provider for checkout.session.completed with SETUP_FEE", async () => {
    const fakeEvent = {
      id: "evt_setup",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          payment_intent: "pi_123",
          amount_total: 49900,
          currency: "usd",
          metadata: {
            provider_id: "prov_1",
            order_kind: "SETUP_FEE",
          },
        },
      },
    };
    mockConstructEvent.mockReturnValue(fakeEvent);

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      const c = chainMock();
      // All operations succeed
      c.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      c.upsert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      c.update.mockReturnValue({
        eq: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
      });
      c.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      return c;
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);

    // Should have called providers and sites tables (activation)
    expect(calls).toContain("providers");
    expect(calls).toContain("sites");
  });

  it("updates order status and confirms booking for payment_intent.succeeded", async () => {
    const fakeEvent = {
      id: "evt_pi_ok",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_456",
          amount_received: 5000,
          amount: 5000,
          currency: "usd",
          metadata: {
            provider_id: "prov_2",
            booking_id: "book_1",
          },
        },
      },
    };
    mockConstructEvent.mockReturnValue(fakeEvent);

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      const c = chainMock();
      c.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      c.upsert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      c.update.mockReturnValue({
        eq: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
      });
      c.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      return c;
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);

    // Should have updated bookings table (CONFIRMED)
    expect(calls).toContain("bookings");
  });
});
