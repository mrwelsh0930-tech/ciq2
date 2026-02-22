"use client";

/* eslint-disable @next/next/no-img-element */

interface AssuredHeaderProps {
  onBack?: () => void;
  showBack?: boolean;
}

export function AssuredHeader({ onBack, showBack = true }: AssuredHeaderProps) {
  return (
    <div
      className="shrink-0 bg-[#F1F5F9] safe-top"
      style={{
        boxShadow: "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center justify-between px-4 h-[89px]">
        {/* Back button */}
        {showBack && onBack ? (
          <button
            onClick={onBack}
            className="w-[72px] h-[57px] bg-[#94A3B8] rounded-[8px] flex items-center justify-center active:bg-[#7C8FA3] transition-colors"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M13.5898 23.3894C13.3273 23.6519 12.9712 23.7993 12.6 23.7993C12.2288 23.7993 11.8727 23.6519 11.6102 23.3894L3.21019 14.9894C2.94773 14.7269 2.80029 14.3708 2.80029 13.9996C2.80029 13.6284 2.94773 13.2723 3.21019 13.0098L11.6102 4.60979C11.8742 4.35477 12.2279 4.21366 12.595 4.21685C12.962 4.22004 13.3132 4.36728 13.5727 4.62685C13.8323 4.88642 13.9795 5.23756 13.9827 5.60463C13.9859 5.97171 13.8448 6.32535 13.5898 6.58939L7.57959 12.5996H23.8C24.1713 12.5996 24.5274 12.7471 24.7899 13.0096C25.0525 13.2722 25.2 13.6283 25.2 13.9996C25.2 14.3709 25.0525 14.727 24.7899 14.9895C24.5274 15.2521 24.1713 15.3996 23.8 15.3996H7.57959L13.5898 21.4098C13.8523 21.6723 13.9997 22.0284 13.9997 22.3996C13.9997 22.7708 13.8523 23.1269 13.5898 23.3894Z"
                fill="white"
              />
            </svg>
          </button>
        ) : (
          <div className="w-[72px] h-[57px]" />
        )}

        {/* Assured Logo */}
        <img
          src="/assets/assured-logo.svg"
          alt="Assured"
          className="h-[40px] w-auto"
        />

        {/* Invisible balance element (matches Figma: opacity-0 right button) */}
        <div className="w-[72px] h-[57px] opacity-0" />
      </div>
    </div>
  );
}
