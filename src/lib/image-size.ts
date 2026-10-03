/**
 * Requests an appropriately-sized version of an image from CDNs that
 * support it, instead of downloading a full-resolution photo for a
 * 300px-wide card.
 *
 * This matters a lot on the inventory page: a dozen 1600px photos is
 * several megabytes, most of it wasted, and most visitors are on
 * phones. Rewriting the URL costs nothing and typically cuts image
 * weight by 80–90%.
 *
 * Only CDNs whose resize parameters are known are touched — every other
 * URL is returned untouched, so an unrecognised host can never end up
 * with a broken link.
 */
export function sizedImageUrl(url: string | null | undefined, width: number): string {
  if (!url) return "";

  try {
    const u = new URL(url);

    // Unsplash: supports w / q / auto=format (serves WebP where supported).
    if (u.hostname === "images.unsplash.com") {
      u.searchParams.set("w", String(width));
      u.searchParams.set("q", "80");
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      return u.toString();
    }

    // Supabase Storage: the render endpoint does on-the-fly resizing.
    // Note this is a paid feature on Supabase's free tier for some
    // projects, so the original path is kept as-is if transformation
    // isn't already in use.
    if (u.hostname.endsWith(".supabase.co") && u.pathname.includes("/storage/v1/object/public/")) {
      return url;
    }

    // Cloudinary: width/quality/format go in the transformation segment.
    if (u.hostname === "res.cloudinary.com" && u.pathname.includes("/upload/")) {
      return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
    }

    return url;
  } catch {
    // Not a parseable URL — hand it back and let the browser decide.
    return url;
  }
}

/** Widths used across the app, so the sizes stay consistent. */
export const IMAGE_SIZES = {
  thumb: 200,
  card: 600,
  gallery: 1400,
} as const;
