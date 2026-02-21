"use client";

interface AssuredHeaderProps {
  onBack?: () => void;
  showBack?: boolean;
}

export function AssuredHeader({ onBack, showBack = true }: AssuredHeaderProps) {
  return (
    <div className="shrink-0 bg-white px-4 pt-3 pb-3 safe-top flex items-center relative border-b border-gray-100">
      {showBack && onBack && (
        <button
          onClick={onBack}
          className="absolute left-4 w-11 h-11 bg-[#E8EDF5] rounded-xl flex items-center justify-center active:bg-[#D8DDE5] transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {/* Assured Logo */}
      <div className="mx-auto">
        <svg width="40" height="28" viewBox="0 0 40 28" fill="none">
          <polygon points="20,1 30,27 10,27" fill="#3F6EF2"/>
          <polygon points="13,7 23,27 3,27" fill="#D94F4F" fillOpacity="0.8"/>
          <polygon points="27,7 37,27 17,27" fill="#E8A52E" fillOpacity="0.8"/>
        </svg>
      </div>
    </div>
  );
}
