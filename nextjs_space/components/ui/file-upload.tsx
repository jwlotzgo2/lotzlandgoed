"use client";

import { useState, useRef } from "react";
import { Upload, X, CheckCircle, Loader2 } from "lucide-react";

interface FileUploadProps {
  onUploadComplete: (url: string, path: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  isPublic?: boolean;
}

export function FileUpload({
  onUploadComplete,
  accept = "image/*",
  maxSize = 10,
  isPublic = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (file.size > maxSize * 1024 * 1024) {
      setError(`File too large. Maximum size is ${maxSize}MB.`);
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      // Get presigned URL
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          isPublic,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileUrl, cloudStoragePath } = await presignedRes.json();

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      setUploaded(true);
      onUploadComplete(fileUrl, cloudStoragePath);
    } catch (err) {
      setError("Upload failed. Please try again.");
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setUploaded(false);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      {!uploaded ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <p className="text-sm">Uploading {fileName}...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Upload className="w-8 h-8" />
              <p className="text-sm font-medium">Click or drag to upload</p>
              <p className="text-xs text-gray-400">Max {maxSize}MB</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{fileName}</span>
          </div>
          <button onClick={reset} className="text-gray-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
