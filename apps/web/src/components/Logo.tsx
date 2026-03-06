import React from "react";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="3" width="20" height="18" rx="4" className="fill-brand-600" />
        <path d="M6 8h12M6 12h7M6 16h9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span className="text-xl font-black tracking-tight">My SR Year</span>
    </div>
  );
}
