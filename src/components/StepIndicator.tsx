"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="shrink-0 flex flex-col gap-4 items-center py-4 safe-bottom">
      {/* Progress bar: 304px wide, 10px tall, rounded-full */}
      <div className="w-[304px] h-[10px] bg-[#CBD5E1] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#475569] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-[12px] text-[#475569] font-normal">
        Powered by Assured
      </p>
    </div>
  );
}
