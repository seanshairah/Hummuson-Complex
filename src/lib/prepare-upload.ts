/**
 * Shrinks a picture in the browser before it is uploaded, when it is too big
 * to send.
 *
 * The host refuses any request over 4.5 MB before it reaches the upload
 * route, and a phone photograph is often 3–6 MB — so a large picture is
 * redrawn at no more than 2400 px on its longest side (what the server keeps
 * anyway) and sent as a high-quality JPEG. Smaller files go as they are. If
 * the browser cannot decode the file, the original is sent and the server
 * answers with its own reason.
 */

/** Comfortably under the host's 4.5 MB request limit, form fields included. */
export const UPLOAD_LIMIT = 4 * 1024 * 1024;
const MAX_EDGE = 2400;

export async function prepareUpload(file: File): Promise<File> {
  if (file.size <= UPLOAD_LIMIT || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  // JPEG has no transparency: lay the picture on white, as the page would.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.9, 0.82, 0.72]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= UPLOAD_LIMIT) {
      const name = file.name.replace(/\.[^.]+$/, "") || "photo";
      return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
    }
  }
  return file;
}

/** A readable reason for a failed upload, whatever came back. */
export async function uploadError(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (data?.error) return data.error;
  if (response.status === 413) return "That picture is too large to upload. Try one under 4 MB.";
  return "Upload failed";
}
