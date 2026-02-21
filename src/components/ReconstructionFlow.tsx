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

  const isVehicle = state.collisionEntityType === "vehicle";

  // Determine which steps to show based on collision type
  const activeSteps = STEPS.filter((step) => {
    // Skip "other path" for non-vehicle collisions
    if (!isVehicle && step.id === 4) return false;
    return true;
  });

  const currentStepIndex = activeSteps.findIndex(
    (s) => s.id === state.currentStep
  );

  // Determine map mode
  const getMapMode = (): MapMode => {
    switch (state.currentStep) {
      case 2:
        return state.impactPoint ? "idle" : "place-impact";
      case 3:
      case 4:
        return "draw-path";
      case 5:
        return "place-rest";
      default:
        return "idle";
    }
  };

  // Build completed paths for rendering (combine pre+post into one line per vehicle)
  const getCompletedPaths = () => {
    const paths: { path: LatLng[]; color: string }[] = [];

    // Your vehicle
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

    // Other vehicle
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

    // Go to step 1 (speed/movement) instead of straight to map
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
    // Save speed data, advance to step 2 (impact point)
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
      if (state.currentStep === 2) {
        // Place impact point
        setState((prev) => ({ ...prev, impactPoint: latlng }));
      } else if (state.currentStep === 5) {
        // Place rest position
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

  const handleReset = () => {
    if (state.currentStep === 2) {
      setState((prev) => ({ ...prev, impactPoint: null }));
    } else if (state.currentStep === 5) {
      setState((prev) => ({
        ...prev,
        yourVehicle: { ...prev.yourVehicle, restPosition: null },
      }));
    } else {
      setCurrentPath([]);
    }
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

    // Post-impact bearings
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

    if (currentId === 3 && currentPath.length >= 2 && state.impactPoint) {
      // Save your vehicle path — split at impact
      const { pre, post } = splitPathAtImpact(currentPath, state.impactPoint);
      updatedState.yourVehicle = {
        ...updatedState.yourVehicle,
        preImpactPath: pre,
        postImpactPath: post,
      };
    } else if (currentId === 4 && isVehicle && currentPath.length >= 2 && state.impactPoint) {
      // Save other vehicle path — split at impact
      const { pre, post } = splitPathAtImpact(currentPath, state.impactPoint);
      updatedState.otherEntity = {
        ...(updatedState.otherEntity as VehicleData),
        preImpactPath: pre,
        postImpactPath: post,
      };
    }

    // Compute derived values
    updatedState = computeDerived(updatedState);

    // Find next step
    const nextActiveStep = activeSteps[currentStepIndex + 1];
    if (nextActiveStep) {
      updatedState.currentStep = nextActiveStep.id;
    }

    setState(updatedState);
    setCurrentPath([]);
  };

  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 0:
        return false; // Handled by CollisionTypeSelector
      case 1:
        return false; // Handled by SpeedInput
      case 2:
        return state.impactPoint !== null;
      case 3:
      case 4:
        return currentPath.length >= MIN_PATH_POINTS;
      case 5:
        return state.yourVehicle.restPosition !== null;
      default:
        return false;
    }
  };

  const canUndo = (): boolean => {
    if (state.currentStep === 2) return state.impactPoint !== null;
    if (state.currentStep === 5) return state.yourVehicle.restPosition !== null;
    return currentPath.length > 0;
  };

  const handleStartOver = () => {
    setState(INITIAL_STATE);
    setCurrentPath([]);
  };

  // Get instruction text for current step
  const getInstruction = (): string => {
    switch (state.currentStep) {
      case 2:
        return state.impactPoint
          ? "Tap to move the impact point, or continue."
          : "Tap where the collision happened.";
      case 3:
        return "Draw your path — start where you came from, go through the red dot, end where you went.";
      case 4:
        return "Now draw the other vehicle's path through the red dot.";
      case 5:
        return "Tap where your vehicle came to a stop.";
      default:
        return "";
    }
  };

  // Get the current draw color based on step
  const getCurrentPathColor = (): string => {
    if (state.currentStep === 4) return OTHER_PATH_COLOR;
    return YOUR_PATH_COLOR;
  };

  // Step 0: Collision type selection
  if (state.currentStep === 0) {
    return (
      <div className="fixed inset-0 flex flex-col bg-gray-50">
        <div className="flex-1 overflow-y-auto">
          <CollisionTypeSelector onSelect={handleCollisionTypeSelect} />
        </div>
        <StepIndicator
          currentStep={0}
          totalSteps={activeSteps.length}
        />
      </div>
    );
  }

  // Step 1: Speed/movement input (BEFORE map)
  if (state.currentStep === 1) {
    return (
      <div className="fixed inset-0 flex flex-col bg-gray-50">
        <div className="flex-1 overflow-y-auto">
          <SpeedInput
            vehicleLabel="your vehicle"
            onComplete={handleSpeedComplete}
          />
        </div>
        <StepIndicator
          currentStep={currentStepIndex}
          totalSteps={activeSteps.length}
        />
      </div>
    );
  }

  // Step 6: Summary
  if (state.currentStep === 6) {
    return (
      <div className="fixed inset-0 flex flex-col bg-gray-50">
        <div className="flex-1 overflow-y-auto">
          <Summary state={state} onStartOver={handleStartOver} />
        </div>
        <StepIndicator
          currentStep={currentStepIndex}
          totalSteps={activeSteps.length}
        />
      </div>
    );
  }

  // Map-based steps (2-5)
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

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      {/* Fixed header — won't crop */}
      <div className="shrink-0 bg-white px-4 pt-3 pb-2 safe-top border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 text-center">
          {activeSteps[currentStepIndex]?.title}
        </h2>
        <p className="text-xs text-gray-500 text-center mt-0.5">
          {getInstruction()}
        </p>
      </div>

      {/* Map fills remaining space */}
      <div className="flex-1 relative">
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
        />

        {/* Undo button overlaid on map */}
        {canUndo() && (
          <button
            onClick={handleReset}
            className="absolute bottom-4 left-4 z-20 px-4 py-2 bg-white/90 backdrop-blur rounded-full shadow-lg text-sm font-medium text-gray-700 active:bg-gray-100"
          >
            Redo
          </button>
        )}
      </div>

      {/* Bottom: Continue button + progress */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <button
          onClick={goToNextStep}
          disabled={!canProceed()}
          className="w-full py-3 text-base font-semibold text-white bg-blue-600 rounded-xl disabled:bg-blue-300 disabled:cursor-not-allowed active:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
      <StepIndicator
        currentStep={currentStepIndex}
        totalSteps={activeSteps.length}
      />
    </div>
  );
}
