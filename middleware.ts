/**
 * Routes social-media crawlers to the link-preview renderer.
 *
 * Only bots are redirected. Real visitors fall straight through to the
 * normal single-page app, so this costs nothing in page speed and can't
 * change what a person sees.
 */
import { next, rewrite } from "@vercel/edge";

export const config = {
  // Only vehicle pages have per-item previews worth rendering.
  matcher: "/vehicles/:slug*",
};

// Matches the crawlers that fetch link previews without running
// JavaScript. Deliberately specific rather than a generic /bot/ test, so
// a real browser whose user-agent happens to contain "bot" isn't served
// the stub page.
//
// Search engines (Googlebot, bingbot, Applebot) are deliberately NOT
// listed: they render JavaScript and should index the full vehicle page.
// Sending them the bare preview stub would give them a thin page to rank
// instead of the real listing.
const CRAWLER_PATTERN =
  /(facebookexternalhit|Facebot|WhatsApp|Twitterbot|Slackbot|LinkedInBot|TelegramBot|Discordbot|redditbot|SkypeUriPreview|vkShare|Pinterest)/i;

export default function middleware(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!CRAWLER_PATTERN.test(userAgent)) return next();

  const url = new URL(request.url);
  const slug = url.pathname.split("/").filter(Boolean).pop() ?? "";

  return rewrite(new URL(`/api/vehicle-preview?slug=${encodeURIComponent(slug)}`, request.url));
}
