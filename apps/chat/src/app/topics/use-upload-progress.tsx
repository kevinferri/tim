import { useEffect, useState } from "react";

type Props = {
  media?: File;
  isUploadingMedia: boolean;
};

export function useUploadProgres({ media, isUploadingMedia }: Props) {
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!isUploadingMedia || !media) {
      setUploadProgress(0);
      return;
    }

    const timer = setInterval(() => {
      let n = media.size / 500;
      if (n > 100) n = 1;

      setUploadProgress((uploadProgress) => {
        let total = uploadProgress + n;
        if (total > 100) total = 100;

        return total;
      });
    }, 30);

    return () => clearTimeout(timer);
  }, [isUploadingMedia, media]);

  return { uploadProgress };
}
