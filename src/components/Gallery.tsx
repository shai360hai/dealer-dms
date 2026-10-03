import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Expand } from "lucide-react";
import { cn } from "./ui/cn";
import { sizedImageUrl, IMAGE_SIZES } from "../lib/image-size";

export function Gallery({
  images,
  alt,
}: {
  images: { url: string; caption?: string }[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const gallery = images.length > 0 ? images : [{ url: "" }];
  const current = gallery[active] ?? gallery[0]!;

  const next = useCallback(() => setActive((i) => (i + 1) % gallery.length), [gallery.length]);
  const prev = useCallback(() => setActive((i) => (i - 1 + gallery.length) % gallery.length), [gallery.length]);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowRight") prev();
      if (e.key === "ArrowLeft") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, next, prev]);

  return (
    <div>
      <div className="relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-ink-soft)] sm:aspect-[16/10]" onClick={() => setFullscreen(true)}>
        {current.url ? (
          <img src={sizedImageUrl(current.url, IMAGE_SIZES.gallery)} alt={alt} className="h-full w-full object-cover" loading="eager" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-steel)]">אין תמונה זמינה</div>
        )}
        {gallery.length > 1 && (
          <button
            className="absolute bottom-3 end-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(true);
            }}
          >
            <Expand size={13} /> גלריית תמונות
          </button>
        )}
      </div>

      {current.caption && (
        <p className="mt-2 text-center text-xs text-[var(--color-steel-dark)]">{current.caption}</p>
      )}

      {gallery.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {gallery.map((img, i) => (
            <button key={i} onClick={() => setActive(i)} className={cn("relative h-16 w-20 shrink-0 overflow-hidden rounded-[var(--radius-card)] border-2", i === active ? "border-[var(--color-chrome-gold)]" : "border-transparent")}>
              <img src={sizedImageUrl(img.url, IMAGE_SIZES.thumb)} alt="" className="h-full w-full object-cover" loading="lazy" />
              {img.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[9px] leading-tight text-white">
                  {img.caption}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" role="dialog" aria-modal="true">
          <button className="absolute end-4 top-4 text-white" onClick={() => setFullscreen(false)} aria-label="סגירת גלריה">
            <X size={28} />
          </button>
          {gallery.length > 1 && (
            <button className="absolute start-4 text-white" onClick={prev} aria-label="הקודם">
              <ChevronRight size={32} />
            </button>
          )}
          <div className="relative h-[80vh] w-[90vw]">
            {current.url && <img src={sizedImageUrl(current.url, IMAGE_SIZES.gallery)} alt={alt} className="h-full w-full object-contain" />}
          </div>
          {gallery.length > 1 && (
            <button className="absolute end-4 text-white" onClick={next} aria-label="הבא">
              <ChevronLeft size={32} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
