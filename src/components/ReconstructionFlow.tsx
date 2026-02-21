"use client";

import { useState, useCallback } from "react";
import {
  ReconstructionState,
  CollisionEntityType,
  INITIAL_VEHICLE_DATA,
  STEPS,
  LatLng,
  VehicleData,
  OtherEntityData,
} from "@/types/reconstruction";
import {
  getPathEndBearing,
  calculateApproachAngle,
  classifyCollision,
  toPDOFClock,
  splitPathAtImpact,
} from "@/lib/geometry";
import { MapView, MapMode } from "./MapView";
import { StepIndicator } from "./StepIndicator";
import { AssuredHeader } from "./AssuredHeader";
import { CollisionTypeSelector } from "./CollisionTypeSelector";
import { SpeedInput } from "./SpeedInput";
import { Summary } from "./Summary";

const INITIAL_STATE: ReconstructionState = {
  currentStep: 0,
  collisionEntityType: null,
  impactPoint: null,
  mapBearingAtImpact: null,
  yourVehicle: { ...INITIAL_VEHICLE_DATA, id: "you", label: "Your vehicle" },
  otherEntity: { ...INITIAL_VEHICLE_DATA, id: "other", label: "Other vehicle" },
  derived: {
    approachAngle: null,
    separationAngle: null,
    collisionType: null,
    pdofClockApprox: null,
  },
};

const MIN_PATH_POINTS = 2;

// Path colors per vehicle
const YOUR_PATH_COLOR = "#3B82F6";
const OTHER_PATH_COLOR = "#F59E0B";

export function ReconstructionFlow() {
  const [state, setState] = useState<ReconstructionState>(INITIAL_STATE);
  const [currentPath, setCurrentPath] = useState<LatLng[]>([]);
  const [drawComplete, setDrawComplete] = useState(false);

  const isVehicle = state.collisionEntityType === "vehicle";

  // Determine which steps to show based on collision type
  const activeSteps = STEPS.filter((step) => {
    if (!isVehicle && step.id === 5) return false;
    return true;
  });

  const currentStepIndex = activeSteps.findIndex(
    (s) => s.id === state.currentStep
  );

  // Navigation
  const goBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = activeSteps[currentStepIndex - 1];
      setState((prev) => ({ ...prev, currentStep: prevStep.id }));
      setCurrentPath([]);
      setDrawComplete(false);
    }
  };

  // Determine map mode
  const getMapMode = (): MapMode => {
    // If draw is complete, switch to idle so user can review
    if (drawComplete && (state.currentStep === 4 || state.currentStep === 5)) {
      return "idle";
    }
    switch (state.currentStep) {
      case 3:
        return state.impactPoint ? "idle" : "place-impact";
      case 4:
      case 5:
        return "draw-path";
      case 6:
        return "place-rest";
      default:
        return "idle";
    }
  };

  // Build completed paths for rendering
  const getCompletedPaths = () => {
    const paths: { path: LatLng[]; color: string }[] = [];

    const yourPre = state.yourVehicle.preImpactPath;
    const yourPost = state.yourVehicle.postImpactPath;
    if (yourPre.length > 0 || yourPost.length > 0) {
      let fullPath: LatLng[];
      if (yourPre.length > 0 && yourPost.length > 1) {
        fullPath = [...yourPre, ...yourPost.slice(1)];
      } else if (yourPre.length > 0) {
        fullPath = yourPre;
      } else {
        fullPath = yourPost;
      }
      paths.push({ path: fullPath, color: YOUR_PATH_COLOR });
    }

    if (isVehicle && "preImpactPath" in state.otherEntity) {
      const other = state.otherEntity as VehicleData;
      const otherPre = other.preImpactPath;
      const otherPost = other.postImpactPath;
      if (otherPre.length > 0 || otherPost.length > 0) {
        let fullPath: LatLng[];
        if (otherPre.length > 0 && otherPost.length > 1) {
          fullPath = [...otherPre, ...otherPost.slice(1)];
        } else if (otherPre.length > 0) {
          fullPath = otherPre;
        } else {
          fullPath = otherPost;
        }
        paths.push({ path: fullPath, color: OTHER_PATH_COLOR });
      }
    }

    return paths;
  };

  const handleCollisionTypeSelect = (type: CollisionEntityType) => {
    const otherEntity: VehicleData | OtherEntityData =
      type === "vehicle"
        ? { ...INITIAL_VEHICLE_DATA, id: "other", label: "Other vehicle" }
        : {
            type,
            label:
              type === "animal"
                ? "Animal"
                : type === "object"
                  ? "Object"
                  : "Property",
            position: null,
            description: "",
          };

    setState((prev) => ({
      ...prev,
      currentStep: 1,
      collisionEntityType: type,
      otherEntity,
    }));
  };

  const handleSpeedComplete = (data: {
    movementType: "forward" | "reverse" | "stopped";
    speedEstimate: number | null;
  }) => {
    setState((prev) => ({
      ...prev,
      yourVehicle: {
        ...prev.yourVehicle,
        movementType: data.movementType,
        speedEstimate: data.speedEstimate,
      },
      currentStep: 2,
    }));
  };

  const handleMapClick = useCallback(
    (latlng: LatLng) => {
      if (state.currentStep === 3) {
        setState((prev) => ({ ...prev, impactPoint: latlng }));
      } else if (state.currentStep === 6) {
        setState((prev) => ({
          ...prev,
          yourVehicle: { ...prev.yourVehicle, restPosition: latlng },
        }));
      }
    },
    [state.currentStep]
  );

  const handlePathUpdate = useCallback((path: LatLng[]) => {
    setCurrentPath(path);
  }, []);

  const handleDrawEnd = useCallback(() => {
    setDrawComplete(true);
  }, []);

  const handleRedraw = () => {
    setCurrentPath([]);
    setDrawComplete(false);
  };

  const computeDerived = (s: ReconstructionState): ReconstructionState => {
    const yourBearing = getPathEndBearing(s.yourVehicle.preImpactPath);
    const updated = { ...s };
    updated.yourVehicle = {
      ...s.yourVehicle,
      approachBearing: yourBearing,
    };

    if (isVehicle && "preImpactPath" in s.otherEntity) {
      const otherVehicle = s.otherEntity as VehicleData;
      const otherBearing = getPathEndBearing(otherVehicle.preImpactPath);

      if (yourBearing !== null && otherBearing !== null) {
        const angle = calculateApproachAngle(yourBearing, otherBearing);
        updated.derived = {
          approachAngle: angle,
          separationAngle: null,
          collisionType: classifyCollision(angle),
          pdofClockApprox: toPDOFClock(angle),
        };
      }
    }

    if (s.yourVehicle.postImpactPath.length >= 2) {
      const postBearing = getPathEndBearing(s.yourVehicle.postImpactPath);
      updated.yourVehicle.separationBearing = postBearing;
      if (yourBearing !== null && postBearing !== null) {
        updated.yourVehicle.headingChange = postBearing - yourBearing;
      }
    }

    return updated;
  };

  const goToNextStep = () => {
    const currentId = state.currentStep;
    let updatedState = { ...state };

    if (currentId === 4 && currentPath.length >= 2 && state.impactPoint) {
      const { pre, post } = splitPathAtImpact(currentPath, state.impactPoint);
      updatedState.yourVehicle = {
        ...updatedState.yourVehicle,
        preImpactPath: pre,
        postImpactPath: post,
      };
    } else if (currentId === 5 && isVehicle && currentPath.length >= 2 && state.impactPoint) {
      const { pre, post } = splitPathAtImpact(currentPath, state.impactPoint);
      updatedState.otherEntity = {
        ...(updatedState.otherEntity as VehicleData),
        preImpactPath: pre,
        postImpactPath: post,
      };
    }

    updatedState = computeDerived(updatedState);

    const nextActiveStep = activeSteps[currentStepIndex + 1];
    if (nextActiveStep) {
      updatedState.currentStep = nextActiveStep.id;
    }

    setState(updatedState);
    setCurrentPath([]);
    setDrawComplete(false);
  };

  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 0:
      case 1:
        return false;
      case 3:
        return state.impactPoint !== null;
      case 4:
      case 5:
        return currentPath.length >= MIN_PATH_POINTS;
      case 6:
        return state.yourVehicle.restPosition !== null;
      default:
        return false;
    }
  };

  const handleStartOver = () => {
    setState(INITIAL_STATE);
    setCurrentPath([]);
    setDrawComplete(false);
  };

  // Get the current draw color based on step
  const getCurrentPathColor = (): string => {
    if (state.currentStep === 5) return OTHER_PATH_COLOR;
    return YOUR_PATH_COLOR;
  };

  // Get instruction text for map steps
  const getMapInstruction = (): string => {
    switch (state.currentStep) {
      case 3:
        return state.impactPoint
          ? "Tap to reposition, or confirm below."
          : "Tap where the collision happened.";
      case 4:
        return drawComplete
          ? "Does this look like the path driven by your vehicle?"
          : "Draw the path driven by your vehicle, leading up to and after the collision.";
      case 5:
        return drawComplete
          ? "Does this look like the path driven by the other vehicle?"
          : "Draw the path driven by the other vehicle, leading up to and after the collision.";
      case 6:
        return "Tap where your vehicle came to a stop.";
      default:
        return "";
    }
  };

  // Check if we have completed paths to show labels for
  const hasYourPath = state.yourVehicle.preImpactPath.length > 0;
  const hasOtherPath = isVehicle && "preImpactPath" in state.otherEntity &&
    (state.otherEntity as VehicleData).preImpactPath.length > 0;

  // ─── Shared layout wrapper ───
  const PageShell = ({
    children,
    showBack = true,
  }: {
    children: React.ReactNode;
    showBack?: boolean;
  }) => (
    <div className="fixed inset-0 flex flex-col bg-[#F5F5F5]">
      <AssuredHeader onBack={showBack ? goBack : undefined} showBack={showBack} />
      {children}
      <StepIndicator
        currentStep={currentStepIndex}
        totalSteps={activeSteps.length}
      />
    </div>
  );

  // ─── Step 0: Collision type ───
  if (state.currentStep === 0) {
    return (
      <PageShell showBack={false}>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm mx-auto">
            <CollisionTypeSelector onSelect={handleCollisionTypeSelect} />
          </div>
        </div>
      </PageShell>
    );
  }

  // ─── Step 1: Speed/movement ───
  if (state.currentStep === 1) {
    return (
      <PageShell>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm mx-auto">
            <SpeedInput
              vehicleLabel="your vehicle"
              onComplete={handleSpeedComplete}
            />
          </div>
        </div>
      </PageShell>
    );
  }

  // ─── Step 2: Pre-draw instruction ───
  if (state.currentStep === 2) {
    return (
      <PageShell>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex items-center">
          <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm mx-auto w-full">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-3">
              Now we&apos;ll use a simple drawing tool to show what happened.
            </h2>
            <p className="text-gray-500 text-center mb-6 text-sm">
              Draw each vehicle&apos;s full path with your finger, leading up to and after the collision.
            </p>

            {/* Illustration */}
            <div className="bg-gray-100 rounded-xl p-6 mb-6 flex items-center justify-center">
              <svg width="200" height="100" viewBox="0 0 200 100" fill="none">
                {/* Blue path (horizontal) */}
                <line x1="20" y1="50" x2="120" y2="50" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round"/>
                {/* Red path (vertical) */}
                <line x1="100" y1="20" x2="100" y2="90" stroke="#EF4444" strokeWidth="6" strokeLinecap="round"/>
                {/* Impact dot */}
                <circle cx="100" cy="50" r="8" fill="#EF4444" stroke="white" strokeWidth="3"/>
                {/* Blue car */}
                <rect x="112" y="44" width="16" height="12" rx="2" fill="#3B82F6" stroke="white" strokeWidth="1.5"/>
                {/* Red car */}
                <rect x="94" y="76" width="12" height="16" rx="2" fill="#EF4444" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>

            <button
              onClick={goToNextStep}
              className="w-full py-3 text-base font-semibold text-white bg-blue-600 rounded-xl active:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ─── Step 7: Summary ───
  if (state.currentStep === 7) {
    return (
      <PageShell>
        <div className="flex-1 overflow-y-auto">
          <Summary state={state} onStartOver={handleStartOver} />
        </div>
      </PageShell>
    );
  }

  // ─── Map-based steps (3-6) ───
  const otherEntityPos =
    !isVehicle && "position" in state.otherEntity
      ? (state.otherEntity as OtherEntityData).position
      : null;

  const restPositions = [
    state.yourVehicle.restPosition,
    isVehicle && "restPosition" in state.otherEntity
      ? (state.otherEntity as VehicleData).restPosition
      : null,
  ];

  const isDrawStep = state.currentStep === 4 || state.currentStep === 5;
  const showConfirmation = isDrawStep && drawComplete && currentPath.length >= MIN_PATH_POINTS;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F5F5]">
      <AssuredHeader onBack={goBack} />

      {/* Instruction card above map */}
      <div className="shrink-0 px-4 pt-2 pb-2">
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm">
          <p className="text-base font-semibold text-gray-900 text-center">
            {getMapInstruction()}
          </p>
        </div>
      </div>

      {/* Map fills remaining space */}
      <div className="flex-1 relative mx-4 mb-2 rounded-xl overflow-hidden shadow-sm">
        <MapView
          mode={getMapMode()}
          impactPoint={state.impactPoint}
          currentPath={currentPath}
          currentPathColor={getCurrentPathColor()}
          completedPaths={getCompletedPaths()}
          otherEntityPosition={otherEntityPos}
          restPositions={restPositions}
          onMapClick={handleMapClick}
          onPathUpdate={handlePathUpdate}
          onDrawEnd={handleDrawEnd}
        />

        {/* Vehicle label pills */}
        {(hasYourPath || (isDrawStep && state.currentStep === 5 && currentPath.length > 0) || hasOtherPath) && (
          <div className="absolute bottom-3 left-3 z-20 space-y-1.5">
            {(hasYourPath || (state.currentStep === 4 && currentPath.length > 0)) && (
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: YOUR_PATH_COLOR }} />
                <span className="text-xs font-medium text-gray-700">Your vehicle</span>
              </div>
            )}
            {(hasOtherPath || (state.currentStep === 5 && currentPath.length > 0)) && (
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: OTHER_PATH_COLOR }} />
                <span className="text-xs font-medium text-gray-700">Other vehicle</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        {showConfirmation ? (
          /* Redraw / Confirm buttons */
          <div className="flex gap-3">
            <button
              onClick={handleRedraw}
              className="flex-1 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl active:bg-gray-50 transition-colors"
            >
              Redraw
            </button>
            <button
              onClick={goToNextStep}
              className="flex-1 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl active:bg-blue-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        ) : (
          /* Standard Continue / Confirm button */
          <button
            onClick={state.currentStep === 3 ? goToNextStep : goToNextStep}
            disabled={!canProceed()}
            className="w-full py-3 text-base font-semibold text-white bg-blue-600 rounded-xl disabled:bg-blue-300 disabled:cursor-not-allowed active:bg-blue-700 transition-colors"
          >
            {state.currentStep === 3 ? "Confirm location" : "Continue"}
          </button>
        )}
      </div>

      <StepIndicator
        currentStep={currentStepIndex}
        totalSteps={activeSteps.length}
      />
    </div>
  );
}
