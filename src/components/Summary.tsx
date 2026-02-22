"use client";

import { useState } from "react";
import { ReconstructionState } from "@/types/reconstruction";
import { COLLISION_TYPE_OPTIONS } from "@/lib/geometry";

interface SummaryProps {
  state: ReconstructionState;
  onStartOver: () => void;
  onCollisionTypeOverride: (type: string) => void;
}

const TREND_LABELS: Record<string, string> = {
  accelerating: "Speeding up",
  decelerating: "Slowing down",
  constant: "Same speed",
  unknown: "Not sure",
};

export function Summary({ state, onStartOver, onCollisionTypeOverride }: SummaryProps) {
  const isVehicle = state.collisionEntityType === "vehicle";
  const otherLabel = isVehicle
    ? "Another vehicle"
    : state.collisionEntityType === "animal"
      ? "An animal"
      : state.collisionEntityType === "object"
        ? "An object"
        : "Property";

  const movementLabel = state.yourVehicle.movementType === "forward"
    ? "Driving forward"
    : state.yourVehicle.movementType === "reverse"
      ? "Reversing"
      : state.yourVehicle.movementType === "stopped"
        ? "Stopped / Parked"
        : null;

  // Collision type: override > derived > unable to determine
  const collisionType = state.collisionTypeOverride
    || state.derived.collisionType
    || "Unable to determine";

  const [editing, setEditing] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);

  const handleTypeSelect = (type: string) => {
    if (type === "Other") {
      setShowOtherInput(true);
    } else {
      onCollisionTypeOverride(type);
      setEditing(false);
      setShowOtherInput(false);
    }
  };

  const handleOtherSubmit = () => {
    if (otherText.trim()) {
      onCollisionTypeOverride(otherText.trim());
      setEditing(false);
      setShowOtherInput(false);
      setOtherText("");
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-[#1660F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-medium text-[18px] leading-[28px] tracking-[-0.26px] text-[#475569]">All done</h2>
        <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#94A3B8] mt-1">Here&apos;s what you told us.</p>
      </div>

      <div className="w-full space-y-3">
        {/* What you hit */}
        <div className="bg-[#F1F5F9] rounded-[8px] p-4">
          <p className="text-[12px] text-[#94A3B8] uppercase tracking-wide mb-1">
            Collided with
          </p>
          <p className="font-medium text-[14px] text-[#475569]">{otherLabel}</p>
        </div>

        {/* Collision type (vehicle-to-vehicle only) */}
        {isVehicle && (
          <div className="bg-[#F1F5F9] rounded-[8px] p-4">
            <p className="text-[12px] text-[#94A3B8] uppercase tracking-wide mb-2">
              Collision type
            </p>
            {!editing ? (
              <div className="flex items-center justify-between">
                <p className="font-medium text-[14px] text-[#475569]">{collisionType}</p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-[13px] font-medium text-[#1660F4] active:text-[#1250D4]"
                >
                  Edit
                </button>
              </div>
            ) : showOtherInput ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Describe the collision type"
                  autoFocus
                  className="w-full h-[44px] px-3 border border-[#D4D4D4] rounded-[6px] text-[14px] text-[#475569] placeholder:text-[#94A3B8] focus:border-[#1660F4] focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowOtherInput(false); setOtherText(""); }}
                    className="flex-1 h-[36px] border border-[#D4D4D4] rounded-[6px] text-[13px] text-[#475569]"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleOtherSubmit}
                    disabled={!otherText.trim()}
                    className="flex-1 h-[36px] bg-[#1660F4] rounded-[6px] text-[13px] text-white disabled:bg-[#94A3B8]"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {COLLISION_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleTypeSelect(opt)}
                    className={`w-full text-left px-3 py-2 rounded-[6px] text-[14px] transition-colors ${
                      collisionType === opt
                        ? "bg-[#1660F4] text-white font-medium"
                        : "bg-white text-[#475569] hover:bg-[#E2E8F0]"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
                <button
                  onClick={() => handleTypeSelect("Other")}
                  className="w-full text-left px-3 py-2 rounded-[6px] text-[14px] bg-white text-[#475569] hover:bg-[#E2E8F0] transition-colors"
                >
                  Other
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="w-full text-center py-1.5 text-[13px] text-[#94A3B8]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Your vehicle info */}
        <div className="bg-[#F1F5F9] rounded-[8px] p-4">
          <p className="text-[12px] text-[#1660F4] uppercase tracking-wide mb-2">
            Your vehicle
          </p>
          <div className="space-y-2 text-[14px]">
            {movementLabel && (
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Before the collision</span>
                <span className="font-medium text-[#475569]">{movementLabel}</span>
              </div>
            )}
            {state.yourVehicle.speedEstimate !== null && (
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Estimated speed</span>
                <span className="font-medium text-[#475569]">
                  ~{state.yourVehicle.speedEstimate} mph
                </span>
              </div>
            )}
            {state.yourVehicle.speedEstimate === null && state.yourVehicle.movementType && state.yourVehicle.movementType !== "stopped" && (
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Estimated speed</span>
                <span className="font-medium text-[#94A3B8]">Not sure</span>
              </div>
            )}
            {state.yourVehicle.speedTrend && (
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Speed change</span>
                <span className="font-medium text-[#475569]">
                  {TREND_LABELS[state.yourVehicle.speedTrend] || state.yourVehicle.speedTrend}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Path</span>
              <span className="font-medium text-[#1660F4]">Recorded</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Rest position</span>
              <span className="font-medium text-[#1660F4]">Recorded</span>
            </div>
          </div>
        </div>

        {/* Other vehicle info */}
        {isVehicle && (
          <div className="bg-[#F1F5F9] rounded-[8px] p-4">
            <p className="text-[12px] text-[#F59E0B] uppercase tracking-wide mb-2">
              Other vehicle
            </p>
            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Path</span>
                <span className="font-medium text-[#1660F4]">Recorded</span>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation */}
        <div className="bg-[#F1F5F9] rounded-[8px] p-4 text-center">
          <p className="text-[14px] text-[#475569]">
            Your reconstruction has been saved. An adjuster will review the details.
          </p>
        </div>

        {/* Carrier Data Preview — demo only */}
        <div className="mt-4 border-t border-dashed border-[#CBD5E1] pt-4">
          <div className="bg-[#6B3CDD]/10 rounded-[8px] p-3 mb-3">
            <p className="text-[12px] font-medium text-[#6B3CDD] uppercase tracking-wide text-center">
              Demo Only — Not User Facing
            </p>
            <p className="text-[12px] text-[#6B3CDD]/70 text-center mt-1">
              Sample of structured data the carrier receives
            </p>
          </div>

          <div className="space-y-2">
            {state.impactPoint && (
              <div className="bg-[#F1F5F9] rounded-[6px] p-3">
                <p className="text-[11px] text-[#94A3B8] uppercase tracking-wide mb-1">Impact Coordinates</p>
                <p className="font-mono text-[12px] text-[#475569]">
                  {state.impactPoint.lat.toFixed(6)}, {state.impactPoint.lng.toFixed(6)}
                </p>
              </div>
            )}

            <div className="bg-[#F1F5F9] rounded-[6px] p-3">
              <p className="text-[11px] text-[#94A3B8] uppercase tracking-wide mb-2">Vehicle 1 (Insured)</p>
              <div className="space-y-1 text-[12px] font-mono text-[#475569]">
                <p>Pre-impact: {state.yourVehicle.preImpactPath.length} pts</p>
                <p>Post-impact: {state.yourVehicle.postImpactPath.length} pts</p>
                {state.yourVehicle.approachBearing !== null && (
                  <p>Bearing: {state.yourVehicle.approachBearing.toFixed(1)}&deg;</p>
                )}
                {state.yourVehicle.restPosition && (
                  <p>Rest: {state.yourVehicle.restPosition.lat.toFixed(6)}, {state.yourVehicle.restPosition.lng.toFixed(6)}</p>
                )}
              </div>
            </div>

            {isVehicle && "preImpactPath" in state.otherEntity && (
              <div className="bg-[#F1F5F9] rounded-[6px] p-3">
                <p className="text-[11px] text-[#94A3B8] uppercase tracking-wide mb-2">Vehicle 2 (Other)</p>
                <div className="space-y-1 text-[12px] font-mono text-[#475569]">
                  <p>Pre-impact: {(state.otherEntity as typeof state.yourVehicle).preImpactPath.length} pts</p>
                  <p>Post-impact: {(state.otherEntity as typeof state.yourVehicle).postImpactPath.length} pts</p>
                </div>
              </div>
            )}

            <div className="bg-[#F1F5F9] rounded-[6px] p-3">
              <p className="text-[11px] text-[#94A3B8] uppercase tracking-wide mb-2">Computed</p>
              <div className="space-y-1 text-[12px] font-mono text-[#475569]">
                {state.derived.approachAngle !== null && (
                  <p>Approach: {state.derived.approachAngle.toFixed(1)}&deg;</p>
                )}
                {state.derived.collisionType && (
                  <p>Type: {state.collisionTypeOverride || state.derived.collisionType}{state.collisionTypeOverride ? " (user corrected)" : ""}</p>
                )}
                {state.derived.pdofClockApprox !== null && (
                  <p>PDOF: {state.derived.pdofClockApprox} o&apos;clock</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Start Over */}
        <button
          onClick={onStartOver}
          className="w-full h-[55px] bg-[#1660F4] rounded-[8px] text-white text-[16px] font-normal leading-[24px] active:bg-[#1250D4] transition-colors mt-4"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
