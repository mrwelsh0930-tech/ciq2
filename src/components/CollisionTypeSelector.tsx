"use client";

import { CollisionEntityType } from "@/types/reconstruction";

interface CollisionTypeSelectorProps {
  onSelect: (type: CollisionEntityType) => void;
}

const OPTIONS: { type: CollisionEntityType; label: string; icon: string; description: string }[] = [
  {
    type: "vehicle",
    label: "Another vehicle",
    icon: "\uD83D\uDE97",
    description: "Car, truck, motorcycle, etc.",
  },
  {
    type: "object",
    label: "An object",
    icon: "\uD83E\uDEA8",
    description: "Pole, guardrail, fence, tree, etc.",
  },
  {
    type: "animal",
    label: "An animal",
    icon: "\uD83E\uDD8C",
    description: "Deer, dog, or other animal",
  },
  {
    type: "property",
    label: "Property",
    icon: "\uD83C\uDFE0",
    description: "Building, wall, mailbox, etc.",
  },
];

export function CollisionTypeSelector({ onSelect }: CollisionTypeSelectorProps) {
  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="font-medium text-[18px] leading-[28px] tracking-[-0.26px] text-[#475569] text-center mb-[10px]">
        What did you collide with?
      </h2>
      <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#475569] text-center mb-8">
        Select what your vehicle made contact with.
      </p>

      <div className="w-full space-y-3">
        {OPTIONS.map((option) => (
          <button
            key={option.type}
            onClick={() => onSelect(option.type)}
            className="w-full flex items-center gap-4 p-4 border border-[#D4D4D4] rounded-[8px] hover:border-[#1660F4] hover:bg-[#F1F5F9] active:bg-[#E2E8F0] transition-all text-left"
          >
            <span className="text-3xl">{option.icon}</span>
            <div>
              <p className="font-medium text-[14px] leading-[20px] text-[#475569]">{option.label}</p>
              <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#94A3B8]">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
