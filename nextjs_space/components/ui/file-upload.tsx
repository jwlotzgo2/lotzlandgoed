"use client";

import { useState, useRef } from "react";
import { Upload, X, CheckCircle, Loader2, FileText } from "lucide-react";

interface FileUploadProps {
  onUploadComplete: (url: string, path: string) => void;
  onCSVParsed?: (tokens: string[]) => void;
  accept?: string;
  maxSize?: number;
  isPublic?: boolean;
  mode?: "upload" | "csv";
}

export function FileUpload({
  onUploadComplete,
  onCSVParsed,
  accept = "image/*",
  maxSize = 10,
  isPublic = false,
  mode = "upload",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseCSVFile = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const tokens = text
          .split(/[\n,\r]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
        resolve(tokens);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleFile = async (file: File) => {
    setError(null);

    if (file.size > maxSize * 1024 * 1024) {
      setError(`File too large. Maximum size is ${maxSize}MB.`);
      return;
    }

    setFileName(file.name);

    // CSV mode — parse locally, no upload needed
    if (mode === "csv" || file.name.endsWith(".csv") || file.type === "text/csv") {
      setUploading(true);
      try {
        const tokens = await parseCSVFile(file);
        if (tokens.length === 0) {
          setError("No tokens found in CSV file.");
          setFileName(null);
          return;
        }
        setUploaded(true);
        onCSVParsed?.(tokens);
      } catch {
        setError("Failed to parse CSV file.");
        setFileName(null);
      } finally {
        setUploading(false);
      }
      return;
    }

    // Image/file upload mode
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const { fileUrl, cloudStoragePath } = await uploadRes.json();

      setUploaded(true);
      onUploadComplete(fileUrl, cloudStoragePath);
    } catch {
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
              <p className="text-sm">Processing {fileName}...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              {mode === "csv" ? (
                <FileText className="w-8 h-8 text-green-600" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
              <p className="text-sm font-medium">
                {mode === "csv" ? "Click to upload CSV file" : "Click or drag to upload"}
              </p>
              <p className="text-xs text-gray-400">
                {mode === "csv" ? "One token per line or comma-separated" : `Max ${maxSize}MB`}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{fileName}</span>
          </div>
          <button onClick={reset} className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
