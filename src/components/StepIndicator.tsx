"use client";

import { STEPS } from "@/types/reconstruction";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const step = STEPS[currentStep];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 safe-top">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Step {currentStep + 1} of {totalSteps}
          </p>
          <h2 className="text-lg font-semibold text-gray-900">{step.title}</h2>
        </div>
      </div>

      {/* Instruction */}
      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
    </div>
  );
}
