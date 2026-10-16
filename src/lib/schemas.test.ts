import { describe, expect, it } from "vitest";
import { inquiryFormSchema } from "./schemas";

const base = { full_name: "דנה כהן", email: "dana@example.com" };

describe("inquiryFormSchema phone", () => {
  it.each([
    ["050-1234567", "0501234567"],
    ["050 123 4567", "0501234567"],
    ["+972-50-123-4567", "0501234567"],
    ["972501234567", "0501234567"],
    ["03-1234567", "031234567"],
  ])("normalises %s", (input, expected) => {
    const result = inquiryFormSchema.safeParse({ ...base, phone: input });
    expect(result.success && result.data.phone).toBe(expected);
  });

  it.each(["12345", "0501234567890", "phone"])("rejects %s", (input) => {
    expect(inquiryFormSchema.safeParse({ ...base, phone: input }).success).toBe(false);
  });
});
