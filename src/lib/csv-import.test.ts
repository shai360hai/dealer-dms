import { describe, expect, it } from "vitest";
import { parseVehiclesCsv, transformHeader, UNMAPPED_PREFIX } from "./csv-import";

const HEADER = "יצרן,דגם,שנה,מחיר,מספר מלאי,קילומטראז׳,סוג דלק,תיבת הילוכים,הנעה,צבע חיצוני,צבע פנים";

function csv(...rows: string[]) {
  return [HEADER, ...rows].join("\n");
}

describe("transformHeader", () => {
  it("maps Hebrew headers regardless of geresh/apostrophe variants", () => {
    expect(transformHeader("קילומטראז׳")).toBe("mileage");
    expect(transformHeader("קילומטראז'")).toBe("mileage");
    expect(transformHeader("﻿יצרן")).toBe("brand");
  });

  it("is idempotent (Papa Parse may call it twice per column)", () => {
    const once = transformHeader("עמודה לא מוכרת");
    expect(once).toBe(`${UNMAPPED_PREFIX}עמודה לא מוכרת`);
    expect(transformHeader(once)).toBe(once);
    expect(transformHeader(transformHeader("יצרן"))).toBe("brand");
  });

  it("detects per-angle image columns", () => {
    expect(transformHeader("קישור תמונה 1 (חזית)")).toBe("image:front");
    expect(transformHeader("תמונה פנים")).toBe("image:interior");
    expect(transformHeader("תמונה 7")).toBe("image:extra");
  });
});

describe("parseVehiclesCsv", () => {
  it("parses a valid row and translates Hebrew enum values", () => {
    const result = parseVehiclesCsv(csv("Toyota,Corolla,2022,95000,A-100,45000,היברידי,אוטומטי,הנעה קדמית,לבן,שחור"));

    expect(result.invalid).toEqual([]);
    expect(result.valid).toHaveLength(1);
    const [v] = result.valid;
    expect(v).toMatchObject({
      brand: "Toyota",
      model: "Corolla",
      year: 2022,
      price: 95000,
      stock_number: "A-100",
      mileage: 45000,
      fuel_type: "hybrid",
      transmission: "automatic",
      drive_type: "fwd",
      status: "available",
      published: false,
      slug: "toyota-corolla-2022",
    });
  });

  it("reports unknown enum values with the row number Excel would show", () => {
    const result = parseVehiclesCsv(csv("Toyota,Corolla,2022,95000,A-100,0,פחם,אוטומטי,קדמית,לבן,שחור"));
    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.rowNumber).toBe(2);
    expect(result.invalid[0]?.errors.join(" ")).toContain("פחם");
  });

  it("rejects rows missing required fields", () => {
    const result = parseVehiclesCsv(csv(",Corolla,2022,95000,A-100,0,בנזין,ידני,קדמית,לבן,שחור"));
    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.errors.some((e) => e.startsWith("brand"))).toBe(true);
  });

  it("splits comma-separated feature lists inside a quoted cell", () => {
    const text = `${HEADER},תוספות ואבזור\nKia,Niro,2023,120000,B-1,0,חשמלי,אוטומטי,קדמית,כחול,אפור,"גג נפתח, מצלמה אחורית ,חיישני חניה"`;
    const [v] = parseVehiclesCsv(text).valid;
    expect(v?.features).toEqual(["גג נפתח", "מצלמה אחורית", "חיישני חניה"]);
  });

  it("lists unrecognised columns instead of failing", () => {
    const text = `${HEADER},עמודה מוזרה\nKia,Niro,2023,120000,B-1,0,חשמלי,אוטומטי,קדמית,כחול,אפור,x`;
    const result = parseVehiclesCsv(text);
    expect(result.valid).toHaveLength(1);
    expect(result.unmappedHeaders).toEqual(["עמודה מוזרה"]);
  });

  it("keeps angle photos and warns about image-search links", () => {
    const text =
      `${HEADER},קישור תמונה 1 (חזית),תמונה אחורי\n` +
      "Kia,Niro,2023,120000,B-1,0,חשמלי,אוטומטי,קדמית,כחול,אפור," +
      "https://cdn.example.com/front.jpg,https://www.google.com/search?tbm=isch&q=kia";
    const result = parseVehiclesCsv(text);
    expect(result.valid[0]?.angleImages).toEqual([{ angle: "front", url: "https://cdn.example.com/front.jpg" }]);
    expect(result.imageWarnings).toHaveLength(1);
    expect(result.imageWarnings[0]?.rowNumber).toBe(2);
  });
});
