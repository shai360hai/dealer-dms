import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it } from "vitest";
import { PUBLIC_VEHICLE_COLUMNS } from "./vehicle-columns";
import type { PublicVehicle } from "../types/database";

/** Pulls the column list out of `grant select (...) on public.vehicles to anon`. */
function grantedColumns(sqlFile: string): string[] {
  const sql = readFileSync(new URL(`../../supabase/${sqlFile}`, import.meta.url), "utf8");
  const match = sql.match(/grant select \(([^)]*)\)\s+on public\.vehicles to anon/);
  if (!match?.[1]) throw new Error(`No anon column grant found in ${sqlFile}`);
  return match[1].split(",").map((c) => c.trim()).filter(Boolean);
}

describe("PUBLIC_VEHICLE_COLUMNS", () => {
  it("covers exactly the PublicVehicle type", () => {
    expectTypeOf<(typeof PUBLIC_VEHICLE_COLUMNS)[number]>().toEqualTypeOf<keyof PublicVehicle>();
  });

  it("never includes the internal dealer notes", () => {
    expect(PUBLIC_VEHICLE_COLUMNS).not.toContain("dealer_notes");
  });

  // If these drift, public pages either fail outright (selecting a column
  // the database doesn't grant) or a column is exposed that the app
  // doesn't know about.
  it.each(["schema.sql", "migration-harden-security.sql"])("matches the anon GRANT in %s", (file) => {
    expect([...grantedColumns(file)].sort()).toEqual([...PUBLIC_VEHICLE_COLUMNS].sort());
  });
});
