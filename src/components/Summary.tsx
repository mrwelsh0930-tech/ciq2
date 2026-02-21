"use client";

import { ReconstructionState } from "@/types/reconstruction";

interface SummaryProps {
  state: ReconstructionState;
  onStartOver: () => void;
}

export function Summary({ state, onStartOver }: SummaryProps) {
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

  return (
    <div className="px-4 py-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">All done</h2>
        <p className="text-gray-500 mt-1">Here&apos;s what you told us.</p>
      </div>

      <div className="max-w-sm mx-auto space-y-4">
        {/* What you hit */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Collided with
          </p>
          <p className="font-semibold text-gray-900">{otherLabel}</p>
        </div>

        {/* Your vehicle info */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-xs text-blue-600 uppercase tracking-wide mb-2">
            Your vehicle
          </p>
          <div className="space-y-2 text-sm">
            {movementLabel && (
              <div className="flex justify-between">
                <span className="text-gray-600">Before the crash</span>
                <span className="font-medium">{movementLabel}</span>
              </div>
            )}
            {state.yourVehicle.speedEstimate !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated speed</span>
                <span className="font-medium">
                  ~{state.yourVehicle.speedEstimate} mph
                </span>
              </div>
            )}
            {state.yourVehicle.speedEstimate === null && state.yourVehicle.movementType && state.yourVehicle.movementType !== "stopped" && (
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated speed</span>
                <span className="font-medium text-gray-400">Not sure</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Path before crash</span>
              <span className="font-medium text-green-600">Recorded</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Path after crash</span>
              <span className="font-medium text-green-600">Recorded</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rest position</span>
              <span className="font-medium text-green-600">Recorded</span>
            </div>
          </div>
        </div>

        {/* Other vehicle info */}
        {isVehicle && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-xs text-amber-600 uppercase tracking-wide mb-2">
              Other vehicle
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Path before crash</span>
                <span className="font-medium text-green-600">Recorded</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Path after crash</span>
                <span className="font-medium text-green-600">Recorded</span>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation message */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Your reconstruction has been saved. An adjuster will review the details.
          </p>
        </div>

        {/* Carrier Data Preview — demo only */}
        <div className="mt-8 border-t-2 border-dashed border-purple-300 pt-6">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 mb-4">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide text-center">
              Demo Only — Not User Facing
            </p>
            <p className="text-xs text-purple-600 text-center mt-1">
              Sample of structured data the carrier receives
            </p>
          </div>

          <div className="space-y-3">
            {/* Impact coordinates */}
            {state.impactPoint && (
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Impact Coordinates</p>
                <p className="font-mono text-xs text-gray-700">
                  {state.impactPoint.lat.toFixed(6)}, {state.impactPoint.lng.toFixed(6)}
                </p>
              </div>
            )}

            {/* Your vehicle data */}
            <div className="bg-white rounded-xl p-3 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Vehicle 1 (Insured)</p>
              <div className="space-y-1 text-xs font-mono text-gray-700">
                <p>Pre-impact path: {state.yourVehicle.preImpactPath.length} points</p>
                <p>Post-impact path: {state.yourVehicle.postImpactPath.length} points</p>
                {state.yourVehicle.approachBearing !== null && (
                  <p>Approach bearing: {state.yourVehicle.approachBearing.toFixed(1)}&deg;</p>
                )}
                {state.yourVehicle.separationBearing !== null && (
                  <p>Separation bearing: {state.yourVehicle.separationBearing.toFixed(1)}&deg;</p>
                )}
                {state.yourVehicle.headingChange !== null && (
                  <p>Heading change: {state.yourVehicle.headingChange.toFixed(1)}&deg;</p>
                )}
                {state.yourVehicle.restPosition && (
                  <p>Rest: {state.yourVehicle.restPosition.lat.toFixed(6)}, {state.yourVehicle.restPosition.lng.toFixed(6)}</p>
                )}
              </div>
            </div>

            {/* Other vehicle data */}
            {isVehicle && "preImpactPath" in state.otherEntity && (
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Vehicle 2 (Other Party)</p>
                <div className="space-y-1 text-xs font-mono text-gray-700">
                  <p>Pre-impact path: {(state.otherEntity as typeof state.yourVehicle).preImpactPath.length} points</p>
                  <p>Post-impact path: {(state.otherEntity as typeof state.yourVehicle).postImpactPath.length} points</p>
                </div>
              </div>
            )}

            {/* Derived / computed */}
            <div className="bg-white rounded-xl p-3 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Computed Values</p>
              <div className="space-y-1 text-xs font-mono text-gray-700">
                {state.derived.approachAngle !== null && (
                  <p>Approach angle: {state.derived.approachAngle.toFixed(1)}&deg;</p>
                )}
                {state.derived.collisionType && (
                  <p>Classification: {state.derived.collisionType}</p>
                )}
                {state.derived.pdofClockApprox !== null && (
                  <p>PDOF clock: {state.derived.pdofClockApprox} o&apos;clock</p>
                )}
                {state.derived.separationAngle !== null && (
                  <p>Separation angle: {state.derived.separationAngle.toFixed(1)}&deg;</p>
                )}
              </div>
            </div>
          </div>
        </div>

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
