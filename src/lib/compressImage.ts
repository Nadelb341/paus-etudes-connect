/**
 * Compresse une image côté client avant upload (Canvas API du navigateur, aucune dépendance ajoutée).
 * Redimensionne si besoin (plus grande dimension max) et réencode en JPEG à la qualité donnée.
 * Les fichiers non-image (PDF, audio, vidéo...), les GIF (animation) et les SVG (déjà légers,
 * vectoriels) sont renvoyés tels quels. Si la compression n'apporte rien (résultat pas plus léger,
 * ex: image déjà petite), le fichier d'origine est conservé.
 */
export async function compressImage(
  file: File,
  { maxWidthOrHeight = 1600, quality = 0.8 }: { maxWidthOrHeight?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
      const scale = maxWidthOrHeight / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // En cas d'échec (format non décodable par le navigateur...), on garde l'original plutôt que de bloquer l'upload
    return file;
  }
}

/** Photos "casuelles" (recettes, chat, post-its, photos de ménage...) — priorité au poids léger. */
export const compressPhoto = (file: File) => compressImage(file, { maxWidthOrHeight: 1600, quality: 0.8 });

/** Documents à lire (médical, administratif, devoirs, emploi du temps...) — priorité à la lisibilité. */
export const compressDocument = (file: File) => compressImage(file, { maxWidthOrHeight: 2200, quality: 0.9 });
