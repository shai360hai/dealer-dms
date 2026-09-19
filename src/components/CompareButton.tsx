import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { GitCompare, Check } from "lucide-react";
import { cn } from "./ui/cn";

const STORAGE_KEY = "dealer-dms-compare";
const MAX_COMPARE = 3;

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Adds/removes this car from the comparison set, and once there are at
 *  least two, offers to open the comparison directly. */
export function CompareButton({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const [list, setList] = useState<string[]>([]);
  const [full, setFull] = useState(false);

  useEffect(() => setList(read()), [slug]);

  const selected = list.includes(slug);

  function toggle() {
    const current = read();
    let next: string[];
    if (current.includes(slug)) {
      next = current.filter((s) => s !== slug);
    } else {
      if (current.length >= MAX_COMPARE) {
        setFull(true);
        setTimeout(() => setFull(false), 2500);
        return;
      }
      next = [...current, slug];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setList(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={toggle}
        aria-pressed={selected}
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-card)] border px-4 py-2.5 text-sm transition-colors",
          selected
            ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
            : "border-[var(--color-steel)]",
        )}
      >
        {selected ? <Check size={16} /> : <GitCompare size={16} />}
        {selected ? "בהשוואה" : "הוספה להשוואה"}
      </button>

      {list.length >= 2 && (
        <button
          onClick={() => navigate(`/compare?cars=${list.join(",")}`)}
          className="text-sm text-[var(--color-navy)] underline underline-offset-4"
        >
          השוואת {list.length} רכבים
        </button>
      )}

      {full && (
        <span className="text-xs text-[var(--color-status-reserved)]">
          ניתן להשוות עד {MAX_COMPARE} רכבים — הסירו אחד קודם
        </span>
      )}
    </div>
  );
}
