"use client";

export function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <div className="w-5 h-5 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
      <span className="text-gray-500 text-sm">{text}</span>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}
