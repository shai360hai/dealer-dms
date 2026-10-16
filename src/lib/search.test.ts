import { describe, expect, it } from "vitest";
import { sanitizeSearchTerm } from "./search";

describe("sanitizeSearchTerm", () => {
  it("leaves ordinary searches alone", () => {
    expect(sanitizeSearchTerm("  Toyota Corolla ")).toBe("Toyota Corolla");
    expect(sanitizeSearchTerm("טויוטה")).toBe("טויוטה");
    expect(sanitizeSearchTerm("A-100")).toBe("A-100");
  });

  it("removes characters that change the meaning of a PostgREST or=() filter", () => {
    // A comma would otherwise start a new condition, e.g. on dealer_notes.
    expect(sanitizeSearchTerm("x%,dealer_notes.ilike.%margin")).not.toMatch(/[,%]/);
    expect(sanitizeSearchTerm("a(b)c")).toBe("a b c");
    expect(sanitizeSearchTerm("100%*_")).toBe("100");
  });

  it("caps the length", () => {
    expect(sanitizeSearchTerm("a".repeat(500))).toHaveLength(100);
  });
});
