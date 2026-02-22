"use client";

import { useState } from "react";

interface SpeedInputProps {
  vehicleLabel: string;
  onComplete: (data: {
    movementType: "forward" | "reverse" | "stopped";
    speedEstimate: number | null;
  }) => void;
}

export function SpeedInput({ vehicleLabel, onComplete }: SpeedInputProps) {
  const [movementType, setMovementType] = useState<
    "forward" | "reverse" | "stopped" | null
  >(null);
  const [speed, setSpeed] = useState<string>("");
  const [dontKnow, setDontKnow] = useState(false);

  const handleContinue = () => {
    if (!movementType) return;
    onComplete({
      movementType,
      speedEstimate: dontKnow ? null : speed ? parseInt(speed, 10) : null,
    });
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="font-medium text-[18px] leading-[28px] tracking-[-0.26px] text-[#475569] text-center mb-[10px]">
        How was {vehicleLabel} moving?
      </h2>
      <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#475569] text-center mb-8">
        Just before the collision.
      </p>

      {/* Movement type */}
      <div className="w-full space-y-3 mb-8">
        {(
          [
            { value: "forward", label: "Driving forward", icon: "\u27A1\uFE0F" },
            { value: "reverse", label: "Reversing", icon: "\u2B05\uFE0F" },
            { value: "stopped", label: "Stopped / Parked", icon: "\uD83C\uDD7F\uFE0F" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            onClick={() => setMovementType(option.value)}
            className={`w-full flex items-center gap-4 p-4 border rounded-[8px] transition-all text-left ${
              movementType === option.value
                ? "border-[#1660F4] bg-[#F1F5F9]"
                : "border-[#D4D4D4] bg-white hover:border-[#94A3B8]"
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <p className="font-medium text-[14px] leading-[20px] text-[#475569]">{option.label}</p>
          </button>
        ))}
      </div>

      {/* Speed input (only if moving) */}
      {movementType && movementType !== "stopped" && (
        <div className="w-full mb-8">
          <label className="block font-medium text-[14px] leading-[20px] text-[#475569] mb-2">
            Estimated speed (mph)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              value={speed}
              onChange={(e) => {
                setSpeed(e.target.value);
                setDontKnow(false);
              }}
              disabled={dontKnow}
              placeholder="e.g. 25"
              className="flex-1 h-[55px] px-4 border border-[#D4D4D4] rounded-[8px] text-[16px] text-[#475569] text-center focus:border-[#1660F4] focus:outline-none disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
            />
            <span className="text-[#94A3B8] font-medium">mph</span>
          </div>
          <button
            onClick={() => {
              setDontKnow(!dontKnow);
              if (!dontKnow) setSpeed("");
            }}
            className={`mt-3 w-full h-[48px] rounded-[8px] border text-[14px] font-medium transition-all ${
              dontKnow
                ? "border-[#1660F4] bg-[#F1F5F9] text-[#1660F4]"
                : "border-[#D4D4D4] text-[#94A3B8] hover:border-[#94A3B8]"
            }`}
          >
            I&apos;m not sure
          </button>
        </div>
      )}

      {/* Continue */}
      {movementType && (
        <button
          onClick={handleContinue}
          className="w-full h-[55px] bg-[#1660F4] rounded-[8px] text-white text-[16px] font-normal leading-[24px] active:bg-[#1250D4] transition-colors"
        >
          Continue
        </button>
      )}
    </div>
  );
}
