import { supabase } from "./supabase";

const BUCKET = "vehicle-images";
// Storage's remove() accepts a bounded number of paths per call.
const REMOVE_BATCH = 500;

/**
 * Deletes the uploaded photo files belonging to the given vehicles.
 *
 * Deleting a vehicle row cascades to its vehicle_images rows, but not to
 * the files in Storage — without this, every permanently deleted car
 * would leave its photos behind in the public bucket forever. Must run
 * *before* the rows are deleted, since the rows are where the paths live.
 *
 * A storage failure is logged rather than thrown: an orphaned file costs
 * a little disk space, whereas blocking the delete would leave the user
 * unable to empty the bin.
 */
export async function removeVehicleStorage(vehicleIds: string[]): Promise<void> {
  if (vehicleIds.length === 0) return;

  const { data, error } = await supabase
    .from("vehicle_images")
    .select("storage_path")
    .in("vehicle_id", vehicleIds)
    .not("storage_path", "is", null);
  if (error) {
    console.error("Could not list vehicle photos for cleanup", error);
    return;
  }

  const paths = (data ?? []).map((r) => r.storage_path).filter((p): p is string => Boolean(p));
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + REMOVE_BATCH));
    if (removeError) console.error("Could not remove vehicle photos from storage", removeError);
  }
}
