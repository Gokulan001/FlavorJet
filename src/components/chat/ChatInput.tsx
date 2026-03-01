"use client";

import { useRef } from "react";
import { Send, ImagePlus, Mic, MicOff, Loader2 } from "lucide-react";
import { X } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageUpload: (base64: string) => void;
  uploadedImage: string | null;
  onClearImage: () => void;
  isLoading: boolean;
  isListening: boolean;
  onToggleMic: () => void;
  disabled?: boolean;
}

export default function ChatInput({
  value, onChange, onSend, onImageUpload, uploadedImage, onClearImage,
  isLoading, isListening, onToggleMic, disabled,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onImageUpload(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!value.trim() && !uploadedImage) return;
    onSend();
  }

  return (
    <div className="border-t border-gray-200 dark:border-slate-700/50 px-3 py-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      {/* Image Preview */}
      {uploadedImage && (
        <div className="pb-2 px-1">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uploadedImage} alt="Upload" className="h-14 rounded-lg border border-gray-200 dark:border-slate-700" />
            <button
              onClick={() => {
                onClearImage();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        {/* Image upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-400 hover:text-[#fea116] transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 flex-shrink-0"
        >
          <ImagePlus className="w-5 h-5" />
        </button>

        {/* Text input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isListening ? "Listening..." : "Ask about our menu..."}
          disabled={disabled || isListening}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="flex-1 min-w-0 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#fea116]/30 transition-all disabled:opacity-50"
        />

        {/* Mic button */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-2 rounded-lg transition-all flex-shrink-0 ${
            isListening
              ? "bg-red-500 text-white voice-pulse"
              : "text-slate-400 hover:text-[#fea116] hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Send button */}
        <button
          type="submit"
          disabled={isLoading || (!value.trim() && !uploadedImage)}
          className="p-2.5 bg-gradient-to-br from-[#fea116] to-[#e89000] text-[#0f172b] rounded-xl hover:shadow-md hover:shadow-[#fea116]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
