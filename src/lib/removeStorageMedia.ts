import { supabase } from "@/integrations/supabase/client";

type MediaBucket = "post-images" | "reels";

/** Remove the actual Storage object for media uploaded to Zyiro. */
export async function removeStorageMedia(mediaUrl: string | null | undefined): Promise<void> {
  if (!mediaUrl) return;

  let parsed: URL;
  try {
    parsed = new URL(mediaUrl);
  } catch {
    return;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || parsed.host !== new URL(supabaseUrl).host) return;

  const marker = "/storage/v1/object/";
  const markerIndex = parsed.pathname.indexOf(marker);
  if (markerIndex < 0) return;

  const [, visibility, bucketPart, ...pathParts] = parsed.pathname
    .slice(markerIndex + marker.length)
    .split("/");
  if (!visibility || !bucketPart || pathParts.length === 0) return;

  let bucket: string;
  let objectPath: string;
  try {
    bucket = decodeURIComponent(bucketPart);
    objectPath = pathParts.map(decodeURIComponent).join("/");
  } catch {
    throw new Error("The media URL is invalid, so its Storage file could not be removed.");
  }

  if (bucket !== "post-images" && bucket !== "reels") return;

  const { error } = await supabase.storage.from(bucket as MediaBucket).remove([objectPath]);
  if (error) throw error;
}
