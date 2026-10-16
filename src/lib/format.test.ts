import { describe, expect, it } from "vitest";
import { slugify } from "./format";

describe("slugify", () => {
  it("builds lowercase hyphenated slugs and skips empty parts", () => {
    expect(slugify("Changan", "Deepal S07", undefined, 2026)).toBe("changan-deepal-s07-2026");
    expect(slugify("BMW", "X5", "", 2020)).toBe("bmw-x5-2020");
  });

  it("strips accents and collapses punctuation", () => {
    expect(slugify("Citroën", "C5  Aircross!", 2021)).toBe("citroen-c5-aircross-2021");
  });

  it("never leaves leading or trailing hyphens", () => {
    expect(slugify("--Mazda--", "3", 2019)).toBe("mazda-3-2019");
  });
});
