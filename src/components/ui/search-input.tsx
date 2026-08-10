"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  autoFocus = false,
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full min-h-[48px] pl-10 pr-10 rounded-2xl bg-gray-100/80 text-sm text-gray-900 border border-gray-200/80 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:text-gray-700 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          aria-label="Clear search text"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
