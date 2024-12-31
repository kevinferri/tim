import { useEffect, useState } from "react";

type Props = {
  file?: File;
  isUploading: boolean;
};

export function useUploadProgres({ file, isUploading }: Props) {
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!isUploading || !file) {
      setUploadProgress(0);
      return;
    }

    const timer = setInterval(() => {
      let n = file.size / 500;
      if (n > 100) n = 1;

      setUploadProgress((uploadProgress) => {
        let total = uploadProgress + n;
        if (total > 100) total = 100;

        return total;
      });
    }, 30);

    return () => clearTimeout(timer);
  }, [isUploading, file]);

  return { uploadProgress };
}
