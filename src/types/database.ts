// Hand-written to match the shape `supabase gen types typescript` would
// produce for supabase/schema.sql. If you change the schema, regenerate
// this properly with the Supabase CLI:
//   supabase gen types typescript --project-id <ref> > src/types/database.ts

export type UserRole = "super_admin" | "admin" | "editor";
export type VehicleStatus = "available" | "reserved" | "sold";
export type FuelType = "petrol" | "diesel" | "hybrid" | "plugin_hybrid" | "electric";
export type TransmissionType = "manual" | "automatic" | "cvt" | "dct";
export type DriveType = "fwd" | "rwd" | "awd" | "four_wd";
export type InquiryStatus = "new" | "contacted" | "closed";

// postgrest-js's GenericTable constraint requires a Relationships array
// on every table (normally populated with real FK metadata by `supabase
// gen types`). Its absence here silently collapsed every table's
// Insert/Update typing to `never` — this package doesn't rely on
// automatic embedded-resource typing from it (embedded selects are cast
// explicitly, e.g. `as VehicleWithImages[]`), so an empty array is
// enough to satisfy the constraint correctly.
type NoRelationships = { foreignKeyName: string; columns: string[]; isOneToOne?: boolean; referencedRelation: string; referencedColumns: string[] }[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          active?: boolean;
        };
        Update: Partial<{
          email: string;
          full_name: string | null;
          role: UserRole;
          active: boolean;
        }>;
        Relationships: NoRelationships;
      };
      vehicles: {
        Row: {
          id: string;
          slug: string;
          brand: string;
          model: string;
          trim: string | null;
          year: number;
          price: number;
          stock_number: string;
          vin: string | null;
          mileage: number;
          engine: string | null;
          horsepower: number | null;
          battery_capacity: string | null;
          driving_range: number | null;
          fuel_type: FuelType;
          transmission: TransmissionType;
          drive_type: DriveType;
          owners: number;
          exterior_color: string;
          interior_color: string;
          description: string | null;
          features: string[];
          safety_features: string[];
          warranty: string | null;
          service_history: string | null;
          dealer_notes: string | null;
          location: string | null;
          status: VehicleStatus;
          published: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vehicles"]["Row"]> &
          Pick<
            Database["public"]["Tables"]["vehicles"]["Row"],
            "slug" | "brand" | "model" | "year" | "price" | "stock_number" | "fuel_type" | "transmission" | "drive_type" | "exterior_color" | "interior_color"
          >;
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Row"]>;
        Relationships: NoRelationships;
      };
      vehicle_images: {
        Row: {
          id: string;
          vehicle_id: string;
          url: string;
          storage_path: string | null;
          angle: string | null;
          order_index: number;
          is_cover: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          url: string;
          storage_path?: string | null;
          angle?: string | null;
          order_index?: number;
          is_cover?: boolean;
        };
        Update: Partial<{ order_index: number; is_cover: boolean; angle: string | null; url: string }>;
        Relationships: NoRelationships;
      };
      inquiries: {
        Row: {
          id: string;
          vehicle_id: string | null;
          full_name: string;
          phone: string;
          email: string;
          message: string | null;
          status: InquiryStatus;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          vehicle_id?: string | null;
          full_name: string;
          phone: string;
          email: string;
          message?: string | null;
        };
        Update: Partial<{ status: InquiryStatus; deleted_at: string | null }>;
        Relationships: NoRelationships;
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: Record<string, never>;
        Relationships: NoRelationships;
      };
      feature_flags: {
        Row: {
          id: string;
          key: string;
          enabled: boolean;
          description: string | null;
          updated_at: string;
        };
        Insert: { key: string; enabled?: boolean; description?: string | null };
        Update: Partial<{ enabled: boolean }>;
        Relationships: NoRelationships;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      vehicle_status: VehicleStatus;
      fuel_type: FuelType;
      transmission_type: TransmissionType;
      drive_type: DriveType;
      inquiry_status: InquiryStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type VehicleImage = Database["public"]["Tables"]["vehicle_images"]["Row"];
export type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];
export type FeatureFlag = Database["public"]["Tables"]["feature_flags"]["Row"];

export type VehicleWithImages = Vehicle & { vehicle_images: VehicleImage[] };
