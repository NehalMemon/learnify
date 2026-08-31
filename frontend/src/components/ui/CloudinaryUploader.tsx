"use client";

import React from "react";
import { CldUploadWidget, CloudinaryUploadWidgetResults } from "next-cloudinary";
import { cn } from "@/lib/utils";

export interface CloudinaryUploaderProps {
  onSuccess: (url: string) => void;
  buttonText: string;
  className?: string;
  preset?: string;
}

export const CloudinaryUploader: React.FC<CloudinaryUploaderProps> = ({
  onSuccess,
  buttonText,
  className,
  preset,
}) => {
  const uploadPreset = preset || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const handleSuccess = (results: CloudinaryUploadWidgetResults) => {
    const info = results?.info;
    if (info && typeof info !== "string" && info.secure_url) {
      onSuccess(info.secure_url);
    }
  };

  return (
    <CldUploadWidget
      uploadPreset={uploadPreset}
      onSuccess={handleSuccess}
    >
      {({ open }) => {
        return (
          <button
            type="button"
            onClick={() => open?.()}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
              className
            )}
          >
            {buttonText}
          </button>
        );
      }}
    </CldUploadWidget>
  );
};

export default CloudinaryUploader;
