import { v2 as cloudinary } from "cloudinary";

const cloudinarySingleton = () => {
  const client = cloudinary.config({
    secure: true,
  });

  return client;
};

declare global {
  var cloudinaryClient: undefined | ReturnType<typeof cloudinarySingleton>;
}

const cloudinaryClient = globalThis.cloudinaryClient ?? cloudinarySingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.cloudinaryClient = cloudinaryClient;
}

export async function uploadImage(imagePath: string) {
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
