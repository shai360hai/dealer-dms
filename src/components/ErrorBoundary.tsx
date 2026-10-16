import { Component, type ErrorInfo, type ReactNode } from "react";

const RELOAD_FLAG = "dealer-dms-chunk-reload";

/** After a deploy, a tab opened earlier still references the previous
 *  build's lazy-loaded chunks, which no longer exist on the server. */
function isStaleChunkError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    error.message,
  );
}

/**
 * Last line of defence against a blank white screen. A stale-chunk error
 * is fixed by loading the new build, so that case reloads once on its
 * own; anything else shows a message with a manual reload.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);

    if (isStaleChunkError(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
        }
      } catch {
        // sessionStorage unavailable: fall through to the manual button.
      }
    }
  }

  componentDidMount() {
    // Reaching a successful mount means the current build loads fine.
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      // ignore
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">משהו השתבש</h1>
        <p className="text-sm text-[var(--color-steel-dark)]">אירעה שגיאה בטעינת העמוד. נסו לרענן.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-[var(--radius-card)] bg-[var(--color-navy)] px-5 py-2.5 text-sm text-white"
        >
          רענון העמוד
        </button>
      </div>
    );
  }
}
