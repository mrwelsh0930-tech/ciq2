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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        How was {vehicleLabel} moving?
      </h2>
      <p className="text-gray-500 mb-8 text-center">
        Just before the crash happened.
      </p>

      {/* Movement type */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        {(
          [
            { value: "forward", label: "Driving forward", icon: "➡️" },
            { value: "reverse", label: "Reversing", icon: "⬅️" },
            { value: "stopped", label: "Stopped / Parked", icon: "🅿️" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            onClick={() => setMovementType(option.value)}
            className={`w-full flex items-center gap-4 p-4 border-2 rounded-xl transition-all text-left ${
              movementType === option.value
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <p className="font-medium text-gray-900">{option.label}</p>
          </button>
        ))}
      </div>

      {/* Speed input (only if moving) */}
      {movementType && movementType !== "stopped" && (
        <div className="w-full max-w-sm mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="flex-1 p-3 border-2 border-gray-200 rounded-xl text-lg text-center focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
            />
            <span className="text-gray-500 font-medium">mph</span>
          </div>
          <button
            onClick={() => {
              setDontKnow(!dontKnow);
              if (!dontKnow) setSpeed("");
            }}
            className={`mt-3 w-full p-3 rounded-xl border-2 text-sm font-medium transition-all ${
              dontKnow
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
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
          className="w-full max-w-sm py-3 text-base font-semibold text-white bg-blue-600 rounded-xl active:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      )}
    </div>
  );
}
