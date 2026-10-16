/**
 * Makes free text safe to drop into a PostgREST `or=(...)` filter.
 *
 * The search box value is interpolated into a filter string, where
 * commas separate conditions, parentheses group them, and `%`/`*`/`_`
 * are ILIKE wildcards. Left as-is, typing "a,b" breaks the query and a
 * crafted value can add conditions of its own. Those characters carry
 * no meaning in a car search, so they're replaced with spaces.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()%*_\\:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
