"use client";

import { ReconstructionState } from "@/types/reconstruction";

interface SummaryProps {
  state: ReconstructionState;
  onStartOver: () => void;
}

export function Summary({ state, onStartOver }: SummaryProps) {
  const isVehicle = state.collisionEntityType === "vehicle";
  const otherLabel = isVehicle
    ? "Other vehicle"
    : state.collisionEntityType === "animal"
      ? "Animal"
      : state.collisionEntityType === "object"
        ? "Object"
        : "Property";

  return (
    <div className="min-h-[calc(100vh-120px)] px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Reconstruction Summary
      </h2>

      <div className="max-w-sm mx-auto space-y-4">
        {/* Collision Type */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Collision with
          </p>
          <p className="font-semibold text-gray-900">{otherLabel}</p>
        </div>

        {/* Impact Point */}
        {state.impactPoint && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Impact location
            </p>
            <p className="font-mono text-sm text-gray-700">
              {state.impactPoint.lat.toFixed(6)},{" "}
              {state.impactPoint.lng.toFixed(6)}
            </p>
          </div>
        )}

        {/* Your Vehicle */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-xs text-blue-600 uppercase tracking-wide mb-2">
            Your vehicle
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pre-impact path</span>
              <span className="font-medium">
                {state.yourVehicle.preImpactPath.length} points
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Post-impact path</span>
              <span className="font-medium">
                {state.yourVehicle.postImpactPath.length} points
              </span>
            </div>
            {state.yourVehicle.movementType && (
              <div className="flex justify-between">
                <span className="text-gray-600">Movement</span>
                <span className="font-medium capitalize">
                  {state.yourVehicle.movementType}
                </span>
              </div>
            )}
            {state.yourVehicle.speedEstimate !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">Speed</span>
                <span className="font-medium">
                  ~{state.yourVehicle.speedEstimate} mph
                </span>
              </div>
            )}
            {state.yourVehicle.restPosition && (
              <div className="flex justify-between">
                <span className="text-gray-600">Rest position</span>
                <span className="font-mono text-xs">
                  {state.yourVehicle.restPosition.lat.toFixed(4)},{" "}
                  {state.yourVehicle.restPosition.lng.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Other Vehicle (if applicable) */}
        {isVehicle && "preImpactPath" in state.otherEntity && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-xs text-amber-600 uppercase tracking-wide mb-2">
              Other vehicle
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Pre-impact path</span>
                <span className="font-medium">
                  {(state.otherEntity as typeof state.yourVehicle).preImpactPath
                    .length}{" "}
                  points
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Post-impact path</span>
                <span className="font-medium">
                  {
                    (state.otherEntity as typeof state.yourVehicle)
                      .postImpactPath.length
                  }{" "}
                  points
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Derived Data */}
        {state.derived.collisionType && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Computed classification
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <span className="font-medium">{state.derived.collisionType}</span>
              </div>
              {state.derived.approachAngle !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Approach angle</span>
                  <span className="font-medium">
                    {state.derived.approachAngle.toFixed(0)}°
                  </span>
                </div>
              )}
              {state.derived.pdofClockApprox !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">PDOF clock</span>
                  <span className="font-medium">
                    {state.derived.pdofClockApprox} o&apos;clock
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Start Over */}
        <button
          onClick={onStartOver}
          className="w-full py-3 text-base font-semibold text-white bg-blue-600 rounded-xl active:bg-blue-700 transition-colors mt-6"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
