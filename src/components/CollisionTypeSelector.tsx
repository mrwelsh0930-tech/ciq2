"use client";

import { useState } from "react";
import { CollisionEntityType } from "@/types/reconstruction";

interface CollisionTypeSelectorProps {
  onSelect: (type: CollisionEntityType, subType: string | null) => void;
}

const MAIN_OPTIONS: { type: CollisionEntityType; label: string; icon: string; description: string }[] = [
  { type: "vehicle", label: "Another vehicle", icon: "\uD83D\uDE97", description: "Car, truck, motorcycle, etc." },
  { type: "object", label: "An object", icon: "\uD83E\uDEA8", description: "Pole, guardrail, fence, tree, etc." },
  { type: "animal", label: "An animal", icon: "\uD83E\uDD8C", description: "Deer, dog, or other animal" },
  { type: "property", label: "Property", icon: "\uD83C\uDFE0", description: "Building, wall, mailbox, etc." },
];

const SUB_TYPE_OPTIONS: Record<string, { value: string; label: string; icon: string }[]> = {
  animal: [
    { value: "deer", label: "Deer", icon: "\uD83E\uDD8C" },
    { value: "dog", label: "Dog", icon: "\uD83D\uDC15" },
    { value: "duck", label: "Duck / Bird", icon: "\uD83E\uDD86" },
    { value: "other", label: "Other animal", icon: "\uD83D\uDC3E" },
  ],
  object: [
    { value: "pole", label: "Pole", icon: "\uD83E\uDEA7" },
    { value: "guardrail", label: "Guardrail", icon: "\uD83D\uDEA7" },
    { value: "fence", label: "Fence", icon: "\uD83D\uDEA7" },
    { value: "tree", label: "Tree", icon: "\uD83C\uDF32" },
    { value: "other", label: "Other object", icon: "\uD83D\uDCE6" },
  ],
  property: [
    { value: "building", label: "Building", icon: "\uD83C\uDFE2" },
    { value: "wall", label: "Wall", icon: "\uD83E\uDDF1" },
    { value: "mailbox", label: "Mailbox", icon: "\uD83D\uDCEB" },
    { value: "other", label: "Other property", icon: "\uD83C\uDFD8\uFE0F" },
  ],
};

const SUB_TYPE_HEADINGS: Record<string, string> = {
  animal: "What kind of animal?",
  object: "What kind of object?",
  property: "What type of property?",
};

export function CollisionTypeSelector({ onSelect }: CollisionTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<CollisionEntityType | null>(null);

  // Sub-type selection stage
  if (selectedType && selectedType !== "vehicle") {
    const subOptions = SUB_TYPE_OPTIONS[selectedType] || [];
    return (
      <div className="flex flex-col items-center w-full">
        <h2 className="font-medium text-[18px] leading-[28px] tracking-[-0.26px] text-[#475569] text-center mb-[10px]">
          {SUB_TYPE_HEADINGS[selectedType]}
        </h2>
        <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#475569] text-center mb-8">
          This helps us understand the incident better.
        </p>

        <div className="w-full space-y-3">
          {subOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(selectedType, option.value)}
              className="w-full flex items-center gap-4 p-4 border border-[#D4D4D4] rounded-[8px] hover:border-[#1660F4] hover:bg-[#F1F5F9] active:bg-[#E2E8F0] transition-all text-left"
            >
              <span className="text-3xl">{option.icon}</span>
              <p className="font-medium text-[14px] leading-[20px] text-[#475569]">{option.label}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => setSelectedType(null)}
          className="mt-4 text-[14px] text-[#94A3B8] font-medium active:text-[#475569]"
        >
          &larr; Back
        </button>
      </div>
    );
  }

  // Main type selection
  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="font-medium text-[18px] leading-[28px] tracking-[-0.26px] text-[#475569] text-center mb-[10px]">
        What did you collide with?
      </h2>
      <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#475569] text-center mb-8">
        Select what your vehicle made contact with.
      </p>

      <div className="w-full space-y-3">
        {MAIN_OPTIONS.map((option) => (
          <button
            key={option.type}
            onClick={() => {
              if (option.type === "vehicle") {
                onSelect("vehicle", null);
              } else {
                setSelectedType(option.type);
              }
            }}
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
