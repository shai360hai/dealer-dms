import { describe, expect, it } from "vitest";
import { checkImageUrl, splitImageUrls } from "./image-url";

describe("checkImageUrl", () => {
  it("accepts direct image links, with or without an extension", () => {
    expect(checkImageUrl(" https://cdn.example.com/a.jpg ")).toEqual({ ok: true, url: "https://cdn.example.com/a.jpg" });
    expect(checkImageUrl("https://images.unsplash.com/photo-123?w=800").ok).toBe(true);
  });

  it("rejects image-search pages, which are not pictures", () => {
    expect(checkImageUrl("https://www.google.com/search?tbm=isch&q=car").ok).toBe(false);
    expect(checkImageUrl("https://www.bing.com/images/search?q=car").ok).toBe(false);
  });

  it("rejects non-http schemes and garbage", () => {
    expect(checkImageUrl("javascript:alert(1)").ok).toBe(false);
    expect(checkImageUrl("not a url").ok).toBe(false);
    expect(checkImageUrl("").ok).toBe(false);
  });
});

describe("splitImageUrls", () => {
  it("splits on commas, pipes and newlines", () => {
    expect(splitImageUrls("https://a/1.jpg, https://a/2.jpg|https://a/3.jpg\nhttps://a/4.jpg")).toHaveLength(4);
  });
});
