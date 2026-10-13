import { it, expect } from "vitest";
import { serviceConfig } from "../services/ai/config";
const source = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "public-fixture",
  DATABASE_URL:
    "postgresql://runtime:fixture@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
  OPENAI_API_KEY: "provider-fixture",
  OUTCLASS_PUBLIC_URL: "https://outclass.example",
};
it("prefers publishable keys, accepts the legacy key alias, and keeps verified database TLS", () => {
  const c = serviceConfig({
    ...source,
    SUPABASE_ANON_KEY: "legacy-fixture",
    DATABASE_CA_CERT: "public-certificate",
  });
  expect(c.config.supabaseAnonKey).toBe("public-fixture");
  expect(c.pool.ssl).toEqual({
    rejectUnauthorized: true,
    ca: "public-certificate",
  });
  expect(c.pool.connectionString).not.toContain("sslmode");
  expect(c.pool.max).toBe(3);
  const old = serviceConfig({
    ...source,
    SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_ANON_KEY: "legacy-fixture",
  });
  expect(old.config.supabaseAnonKey).toBe("legacy-fixture");
});
it("rejects transaction-mode Supabase connections and reports setting names without values", () => {
  expect(() =>
    serviceConfig({
      ...source,
      DATABASE_URL: source.DATABASE_URL.replace(":5432", ":6543"),
    }),
  ).toThrow("session-pooled");
  expect(() =>
    serviceConfig({ ...source, SUPABASE_URL: "private-value-invalid" }),
  ).toThrow("SUPABASE_URL");
  try {
    serviceConfig({ ...source, SUPABASE_URL: "private-value-invalid" });
  } catch (error) {
    expect(String(error)).not.toContain("private-value-invalid");
  }
});
it("normalizes empty optional billing settings and requires a public Supabase key", () => {
  expect(
    serviceConfig({ ...source, STRIPE_SECRET_KEY: "" }).config.stripeKey,
  ).toBeUndefined();
  expect(() =>
    serviceConfig({ ...source, SUPABASE_PUBLISHABLE_KEY: "" }),
  ).toThrow("SUPABASE_PUBLISHABLE_KEY");
});
