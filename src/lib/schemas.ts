import { z } from "zod";

export const fuelTypeSchema = z.enum(["petrol", "diesel", "hybrid", "plugin_hybrid", "electric"]);
export const transmissionTypeSchema = z.enum(["manual", "automatic", "cvt", "dct"]);
export const driveTypeSchema = z.enum(["fwd", "rwd", "awd", "four_wd"]);
export const vehicleStatusSchema = z.enum(["available", "reserved", "sold"]);
export const inquiryStatusSchema = z.enum(["new", "contacted", "closed"]);

export const vehicleFormSchema = z.object({
  brand: z.string().trim().min(1, "יצרן הוא שדה חובה").max(60),
  model: z.string().trim().min(1, "דגם הוא שדה חובה").max(60),
  trim: z.string().trim().max(60).optional().or(z.literal("")),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  price: z.coerce.number().positive("המחיר חייב להיות גדול מ-0"),
  stock_number: z.string().trim().min(1, "מספר מלאי הוא שדה חובה").max(40),
  vin: z.string().trim().max(32).optional().or(z.literal("")),

  mileage: z.coerce.number().int().min(0),
  engine: z.string().trim().max(60).optional().or(z.literal("")),
  horsepower: z.coerce.number().int().min(0).max(2000).optional(),
  battery_capacity: z.string().trim().max(30).optional().or(z.literal("")),
  driving_range: z.coerce.number().int().min(0).max(2000).optional(),
  fuel_type: fuelTypeSchema,
  transmission: transmissionTypeSchema,
  drive_type: driveTypeSchema,
  owners: z.coerce.number().int().min(0).max(20).default(1),

  exterior_color: z.string().trim().min(1, "צבע חיצוני הוא שדה חובה").max(40),
  interior_color: z.string().trim().min(1, "צבע פנים הוא שדה חובה").max(40),

  description: z.string().trim().max(4000).optional().or(z.literal("")),
  features: z.array(z.string().trim().min(1)).default([]),
  safety_features: z.array(z.string().trim().min(1)).default([]),
  warranty: z.string().trim().max(300).optional().or(z.literal("")),
  service_history: z.string().trim().max(2000).optional().or(z.literal("")),
  dealer_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),

  status: vehicleStatusSchema.default("available"),
  published: z.boolean().default(false),
});
export type VehicleFormInput = z.infer<typeof vehicleFormSchema>;
export type VehicleFormValues = z.input<typeof vehicleFormSchema>;

export const inquiryFormSchema = z.object({
  vehicle_id: z.string().optional(),
  full_name: z.string().trim().min(2, "נא להזין שם מלא").max(80),
  // People type numbers every which way ("050 123 4567", "+972-50-…"),
  // so normalise to plain local digits before validating and storing.
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s\-().]/g, "").replace(/^\+?972/, "0"))
    .pipe(z.string().regex(/^0\d{7,9}$/, "מספר טלפון לא תקין")),
  email: z.string().trim().email("כתובת דוא״ל לא תקינה"),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type InquiryFormInput = z.infer<typeof inquiryFormSchema>;
