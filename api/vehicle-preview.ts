/**
 * Serves link-preview HTML for social crawlers (WhatsApp, Facebook,
 * Telegram, Twitter).
 *
 * Why this exists: the site is a client-rendered SPA, so the HTML a
 * crawler receives has only the site-wide defaults in it — meta tags
 * set by React never run, because crawlers don't execute JavaScript.
 * The result is that sharing a link to a specific car shows the generic
 * site name instead of the car, its photo and its price.
 *
 * Vercel's middleware (see /middleware.ts) routes only crawler requests
 * here. Real visitors are untouched and still get the normal SPA, so
 * there's no cost to page speed or behaviour for actual people.
 */

export const config = { runtime: "edge" };

interface VehicleRow {
  brand: string;
  model: string;
  trim: string | null;
  year: number;
  price: number;
  mileage: number;
  description: string | null;
  slug: string;
  vehicle_images: { url: string; is_cover: boolean; order_index: number }[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? url.pathname.split("/").filter(Boolean).pop() ?? "";

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const siteUrl = process.env.VITE_SITE_URL ?? url.origin;

  if (!slug || !supabaseUrl || !supabaseKey) {
    return htmlResponse(defaultPreview(siteUrl));
  }

  try {
    const query =
      `${supabaseUrl}/rest/v1/vehicles` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&published=eq.true&status=eq.available&deleted_at=is.null` +
      `&select=brand,model,trim,year,price,mileage,description,slug,vehicle_images(url,is_cover,order_index)`;

    const res = await fetch(query, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });

    if (!res.ok) return htmlResponse(defaultPreview(siteUrl));

    const rows = (await res.json()) as VehicleRow[];
    const vehicle = rows[0];
    if (!vehicle) return htmlResponse(defaultPreview(siteUrl));

    const title = [vehicle.brand, vehicle.model, vehicle.trim, vehicle.year]
      .filter(Boolean)
      .join(" ");

    const mileage = new Intl.NumberFormat("he-IL").format(vehicle.mileage);
    const description =
      vehicle.description?.slice(0, 155) ??
      `${formatPrice(vehicle.price)} · ${mileage} ק״מ · ${vehicle.year}`;

    const cover =
      vehicle.vehicle_images.find((i) => i.is_cover) ??
      [...vehicle.vehicle_images].sort((a, b) => a.order_index - b.order_index)[0];

    const canonical = `${siteUrl}/vehicles/${vehicle.slug}`;

    return htmlResponse(
      preview({
        title: `${title} — ${formatPrice(vehicle.price)}`,
        description,
        image: cover?.url,
        url: canonical,
      }),
    );
  } catch {
    return htmlResponse(defaultPreview(siteUrl));
  }
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Previews are cached by the platforms anyway; a short CDN cache
      // keeps repeated crawls off the database.
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}

function preview({
  title,
  description,
  image,
  url,
}: {
  title: string;
  description: string;
  image?: string;
  url: string;
}): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(url)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Dealer DMS" />
<meta property="og:locale" content="he_IL" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
${image ? `<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${escapeHtml(image)}" />` : ""}
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(description)}</p>
<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
</body>
</html>`;
}

function defaultPreview(siteUrl: string): string {
  return preview({
    title: "Dealer DMS — רכבים חדשים ומשומשים למכירה",
    description: "מלאי רכבים עדכני, כולל מפרט מלא, תמונות ותנאי אחריות.",
    url: siteUrl,
  });
}
