/**
 * The vehicle columns anonymous visitors are allowed to read.
 *
 * The database grants the public role SELECT on these columns only —
 * not on dealer_notes — so `select("*")` is rejected for signed-out
 * visitors and every public-site query has to name its columns. Keep
 * this list in step with the GRANT in supabase/schema.sql (a unit test
 * checks that it is).
 */
export const PUBLIC_VEHICLE_COLUMNS = [
  "id", "slug", "brand", "model", "trim", "year", "price", "stock_number", "vin",
  "mileage", "engine", "horsepower", "battery_capacity", "driving_range",
  "fuel_type", "transmission", "drive_type", "owners",
  "exterior_color", "interior_color",
  "description", "features", "safety_features", "warranty", "service_history", "location",
  "status", "published", "deleted_at", "view_count", "created_at", "updated_at",
] as const;

/** Select string for public listings: public columns plus photos. */
export const PUBLIC_VEHICLE_SELECT = `${PUBLIC_VEHICLE_COLUMNS.join(", ")}, vehicle_images(*)`;
