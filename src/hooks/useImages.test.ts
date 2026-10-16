import { describe, expect, it } from "vitest";
import { storagePathFor } from "./useImages";

describe("storagePathFor", () => {
  it("never puts the original (possibly Hebrew) file name in the key", () => {
    const path = storagePathFor("veh-1", { name: "חזית הרכב.JPG", type: "image/jpeg" });
    expect(path).toMatch(/^veh-1\/[0-9a-f-]{36}\.jpg$/);
  });

  it("falls back to the MIME type, then to jpg", () => {
    expect(storagePathFor("v", { name: "photo", type: "image/webp" })).toMatch(/\.webp$/);
    expect(storagePathFor("v", { name: "weird.name with spaces", type: "" })).toMatch(/\.jpg$/);
  });
});
