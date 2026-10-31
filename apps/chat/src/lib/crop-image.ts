import type { Area } from "react-easy-crop";

const AVATAR_SIZE = 512;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// Renders the cropped square at a fixed size, so the upload is small regardless of the source photo.
export async function cropToAvatar(src: string, area: Area) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}
