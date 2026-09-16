import { v2 as cloudinary } from "cloudinary";

// Stands in for a real Cloudinary upload when CLOUDINARY_URL isn't set locally --
// Cloudinary's own public demo asset, so this is a real, always-resolving URL.
const LOCAL_DEV_UPLOAD_RESULT = {
  secure_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
};

export async function uploadImage(imagePath: string) {
  if (
    !["production", "test"].includes(process.env.NODE_ENV ?? "") &&
    !process.env.CLOUDINARY_URL
  ) {
    return LOCAL_DEV_UPLOAD_RESULT;
  }

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
