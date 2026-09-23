import { Check, Copy } from "lucide-react";

export default function CopyButton({ value, copied, onCopy }) {
  const isAvailable = value !== "Not configured yet";

  return (
    <button
      type="button"
      aria-label={isAvailable ? `Copy ${value}` : "Payment detail unavailable"}
      disabled={!isAvailable}
      onClick={() => onCopy(value)}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9d4c9] text-[#716d63] transition hover:border-[#142b23] hover:bg-[#142b23] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
