// ============================================================================
// Unit Tests: Feature Access Logger Middleware
// ============================================================================
// Test suite untuk featureAccessLogger middleware
// Menguji logging fitur akses premium, audit trail, dan security compliance

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { featureAccessLogger } from "./accessLogger";

// Mock Supabase
vi.mock("../lib/supabase.js", () => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }) as any
}));

describe("Feature Access Logger Middleware", () => {
  let app: Hono;
  
  beforeEach(() => {
    app = new Hono();
    app.use("*", featureAccessLogger);
    app.get("/test", async (c) => {
      c.set("user", { sub: "test-user-123" });
      c.set("featureGranted", true);
      return c.json({ success: true });
    });
  });
  
  it("should log premium feature access when feature is accessed", async () => {
    // Mock Supabase insert
    const mockInsert = vi.fn();
    const mockSelect = vi.fn(() => ({ insert: mockInsert }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(require("../lib/supabase.js").supabase).from = mockFrom;
    
    // Call middleware
    const response = await app.fetch("http://localhost/test", {
      method: "GET",
      headers: {
        "x-forwarded-for": "192.168.1.100",
        "user-agent": "Mozilla/5.0 (Test Browser)",
      },
    });
    
    // Verify Supabase insert was called
    expect(mockInsert).toHaveBeenCalled();
    
    const logData = mockInsert.mock.calls[0][0];
    expect(logData.user_id).toBe("test-user-123");
    expect(logData.feature).toBe("income_statement");
    expect(logData.granted).toBe(true);
    expect(logData.ip_address).toBe("192.168.1.100");
  });
  
  it("should not log when no user context", async () => {
    const app2 = new Hono();
    app2.use("*", featureAccessLogger);
    app2.get("/test", async (c) => {
      // Tidak ada user context
      return c.json({ success: true });
    });
    
    const response = await app2.fetch("http://localhost/test");
    
    // Tidak ada Supabase insert karena tidak ada user
  });
});

export {};