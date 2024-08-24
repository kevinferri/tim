import { v2 as cloudinary } from "cloudinary";

export async function uploadImage(imagePath: string) {
  cloudinary.config({
    secure: true,
  });

  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    height: 1000,
    width: 1000,
    crop: "limit",
  };

  try {
    const result = await cloudinary.uploader.upload(imagePath, options);
    return result;
  } catch (error) {
    return undefined;
  }
}
