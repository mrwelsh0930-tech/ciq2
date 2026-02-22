"use client";

import { useState } from "react";

type SpeedTrend = "accelerating" | "decelerating" | "constant" | "unknown";

interface AccelerationInputProps {
  onComplete: (trend: SpeedTrend) => void;
}

const OPTIONS: { value: SpeedTrend; label: string; icon: string }[] = [
  { value: "accelerating", label: "Speeding up", icon: "\u2B06\uFE0F" },
  { value: "decelerating", label: "Slowing down / Braking", icon: "\u2B07\uFE0F" },
  { value: "constant", label: "Same speed", icon: "\u27A1\uFE0F" },
  { value: "unknown", label: "I don\u2019t know", icon: "\uD83E\uDD37" },
];

export function AccelerationInput({ onComplete }: AccelerationInputProps) {
  const [selected, setSelected] = useState<SpeedTrend | null>(null);

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="font-medium text-[18px] leading-[28px] tracking-[-0.26px] text-[#475569] text-center mb-[10px]">
        Leading up to the collision, were you...
      </h2>
      <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#475569] text-center mb-8">
        Were you changing speed before the collision?
      </p>

      <div className="w-full space-y-3 mb-8">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelected(option.value)}
            className={`w-full flex items-center gap-4 p-4 border rounded-[8px] transition-all text-left ${
              selected === option.value
                ? "border-[#1660F4] bg-[#F1F5F9]"
                : "border-[#D4D4D4] bg-white hover:border-[#94A3B8]"
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <p className="font-medium text-[14px] leading-[20px] text-[#475569]">{option.label}</p>
          </button>
        ))}
      </div>

      {selected && (
        <button
          onClick={() => onComplete(selected)}
          className="w-full h-[55px] bg-[#1660F4] rounded-[8px] text-white text-[16px] font-normal leading-[24px] active:bg-[#1250D4] transition-colors"
        >
          Continue
        </button>
      )}
    </div>
  );
}
