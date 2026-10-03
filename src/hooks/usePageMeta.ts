import { useEffect } from "react";

interface PageMeta {
  title: string;
  description?: string;
  image?: string;
  /** Canonical URL for this page. */
  url?: string;
}

function setTag(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

/**
 * Sets the document title and meta tags for the current page.
 *
 * Worth knowing about the limits of doing this client-side: Google
 * renders JavaScript, so this genuinely helps search indexing. Social
 * crawlers (WhatsApp, Facebook) generally do NOT — they read the raw
 * HTML response, so link previews will show the site-wide defaults from
 * index.html rather than the specific car. Fixing that properly needs
 * server-side rendering or prerendering, which is a much larger change.
 */
export function usePageMeta({ title, description, image, url }: PageMeta) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    setTag("property", "og:title", title);
    setTag("property", "og:type", "website");
    if (description) {
      setTag("name", "description", description);
      setTag("property", "og:description", description);
    }
    if (image) {
      setTag("property", "og:image", image);
      setTag("name", "twitter:card", "summary_large_image");
    }
    if (url) {
      setTag("property", "og:url", url);
      setCanonical(url);
    }

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, image, url]);
}
