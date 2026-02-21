"use client";

import { CollisionEntityType } from "@/types/reconstruction";

interface CollisionTypeSelectorProps {
  onSelect: (type: CollisionEntityType) => void;
}

const OPTIONS: { type: CollisionEntityType; label: string; icon: string; description: string }[] = [
  {
    type: "vehicle",
    label: "Another vehicle",
    icon: "🚗",
    description: "Car, truck, motorcycle, etc.",
  },
  {
    type: "object",
    label: "An object",
    icon: "🪨",
    description: "Pole, guardrail, fence, tree, etc.",
  },
  {
    type: "animal",
    label: "An animal",
    icon: "🦌",
    description: "Deer, dog, or other animal",
  },
  {
    type: "property",
    label: "Property",
    icon: "🏠",
    description: "Building, wall, mailbox, etc.",
  },
];

export function CollisionTypeSelector({ onSelect }: CollisionTypeSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        What did you collide with?
      </h2>
      <p className="text-gray-500 mb-8 text-center">
        Select what your vehicle made contact with.
      </p>

      <div className="w-full max-w-sm space-y-3">
        {OPTIONS.map((option) => (
          <button
            key={option.type}
            onClick={() => onSelect(option.type)}
            className="w-full flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all text-left"
          >
            <span className="text-3xl">{option.icon}</span>
            <div>
              <p className="font-semibold text-gray-900">{option.label}</p>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
