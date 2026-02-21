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
  calculateDistance,
} from "@/lib/geometry";
import { MapView, MapMode } from "./MapView";
import { StepIndicator } from "./StepIndicator";
import { BottomBar } from "./BottomBar";
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

export function ReconstructionFlow() {
  const [state, setState] = useState<ReconstructionState>(INITIAL_STATE);
  const [currentPath, setCurrentPath] = useState<LatLng[]>([]);

  const isVehicle = state.collisionEntityType === "vehicle";

  // Determine which steps to show based on collision type
  const activeSteps = STEPS.filter((step) => {
    if (!isVehicle) {
      // Skip "other approach" and "other movement after" for non-vehicle
      if (step.id === 3 || step.id === 5) return false;
    }
    return true;
  });

  const currentStepIndex = activeSteps.findIndex(
    (s) => s.id === state.currentStep
  );

  // Determine map mode
  const getMapMode = (): MapMode => {
    switch (state.currentStep) {
      case 1:
        return state.impactPoint ? "idle" : "place-impact";
      case 2:
      case 3:
        return "draw-pre-path";
      case 4:
      case 5:
        return "draw-post-path";
      case 6:
        return "place-rest";
      default:
        return "idle";
    }
  };

  // Build completed paths for rendering
  const getCompletedPaths = () => {
    const paths: { path: LatLng[]; color: string }[] = [];

    if (state.yourVehicle.preImpactPath.length > 0) {
      paths.push({ path: state.yourVehicle.preImpactPath, color: "#3B82F6" });
    }

    if (
      isVehicle &&
      "preImpactPath" in state.otherEntity &&
      (state.otherEntity as VehicleData).preImpactPath.length > 0
    ) {
      paths.push({
        path: (state.otherEntity as VehicleData).preImpactPath,
        color: "#F59E0B",
      });
    }

    if (state.yourVehicle.postImpactPath.length > 0) {
      paths.push({ path: state.yourVehicle.postImpactPath, color: "#6366F1" });
    }

    if (
      isVehicle &&
      "postImpactPath" in state.otherEntity &&
      (state.otherEntity as VehicleData).postImpactPath.length > 0
    ) {
      paths.push({
        path: (state.otherEntity as VehicleData).postImpactPath,
        color: "#F97316",
      });
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

  const handleMapClick = useCallback(
    (latlng: LatLng) => {
      if (state.currentStep === 1) {
        // Place impact point
        setState((prev) => ({ ...prev, impactPoint: latlng }));
      } else if (state.currentStep === 6) {
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

  const handleUndo = () => {
    if (state.currentStep === 1 && state.impactPoint) {
      setState((prev) => ({ ...prev, impactPoint: null }));
    } else if (state.currentStep === 6) {
      setState((prev) => ({
        ...prev,
        yourVehicle: { ...prev.yourVehicle, restPosition: null },
      }));
    } else if (currentPath.length > 0) {
      setCurrentPath((prev) => prev.slice(0, -1));
    }
  };

  const handleReset = () => {
    if (state.currentStep === 1) {
      setState((prev) => ({ ...prev, impactPoint: null }));
    } else if (state.currentStep === 6) {
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

    // Save current path data
    let updatedState = { ...state };

    if (currentId === 2) {
      // Save your pre-impact path
      const pathToSave =
        currentPath.length > 0 &&
        state.impactPoint &&
        calculateDistance(
          currentPath[currentPath.length - 1],
          state.impactPoint
        ) > 5
          ? [...currentPath, state.impactPoint] // Auto-extend to impact
          : currentPath;

      updatedState.yourVehicle = {
        ...updatedState.yourVehicle,
        preImpactPath: pathToSave,
      };
    } else if (currentId === 3 && isVehicle) {
      // Save other vehicle pre-impact path
      const pathToSave =
        currentPath.length > 0 &&
        state.impactPoint &&
        calculateDistance(
          currentPath[currentPath.length - 1],
          state.impactPoint
        ) > 5
          ? [...currentPath, state.impactPoint]
          : currentPath;

      updatedState.otherEntity = {
        ...(updatedState.otherEntity as VehicleData),
        preImpactPath: pathToSave,
      };
    } else if (currentId === 4) {
      // Save your post-impact path
      updatedState.yourVehicle = {
        ...updatedState.yourVehicle,
        postImpactPath: currentPath,
      };
    } else if (currentId === 5 && isVehicle) {
      // Save other vehicle post-impact path
      updatedState.otherEntity = {
        ...(updatedState.otherEntity as VehicleData),
        postImpactPath: currentPath,
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
    setCurrentPath(
      // Pre-populate post-impact paths starting from impact
      nextActiveStep &&
        (nextActiveStep.id === 4 || nextActiveStep.id === 5) &&
        state.impactPoint
        ? [state.impactPoint]
        : []
    );
  };

  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 0:
        return false; // Handled by CollisionTypeSelector
      case 1:
        return state.impactPoint !== null;
      case 2:
      case 3:
        return currentPath.length >= MIN_PATH_POINTS;
      case 4:
      case 5:
        return currentPath.length >= MIN_PATH_POINTS;
      case 6:
        return state.yourVehicle.restPosition !== null;
      case 7:
        return false; // Handled by SpeedInput
      default:
        return false;
    }
  };

  const canUndo = (): boolean => {
    if (state.currentStep === 1) return state.impactPoint !== null;
    if (state.currentStep === 6) return state.yourVehicle.restPosition !== null;
    return currentPath.length > 0;
  };

  const handleSpeedComplete = (data: {
    movementType: "forward" | "reverse" | "stopped";
    speedEstimate: number | null;
  }) => {
    const updated = computeDerived({
      ...state,
      yourVehicle: {
        ...state.yourVehicle,
        movementType: data.movementType,
        speedEstimate: data.speedEstimate,
      },
      currentStep: 8,
    });
    setState(updated);
  };

  const handleStartOver = () => {
    setState(INITIAL_STATE);
    setCurrentPath([]);
  };

  // Get instruction text for current step
  const getInstruction = (): string => {
    switch (state.currentStep) {
      case 1:
        return state.impactPoint
          ? "Impact point set. Tap again to move it, or continue."
          : "Tap on the map where the vehicles made contact.";
      case 2:
        return "Tap points along your path before the crash. End near the collision point.";
      case 3:
        return "Tap points along the other vehicle's path before the crash.";
      case 4:
        return "Tap points showing where your vehicle went after the crash.";
      case 5:
        return "Tap points showing where the other vehicle went after.";
      case 6:
        return "Tap where your vehicle came to a stop.";
      default:
        return "";
    }
  };

  // Step 0: Collision type selection
  if (state.currentStep === 0) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <StepIndicator
          currentStep={0}
          totalSteps={activeSteps.length}
        />
        <CollisionTypeSelector onSelect={handleCollisionTypeSelect} />
      </div>
    );
  }

  // Step 7: Speed input
  if (state.currentStep === 7) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <StepIndicator
          currentStep={currentStepIndex}
          totalSteps={activeSteps.length}
        />
        <SpeedInput
          vehicleLabel="your vehicle"
          onComplete={handleSpeedComplete}
        />
      </div>
    );
  }

  // Step 8: Summary
  if (state.currentStep === 8) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <StepIndicator
          currentStep={currentStepIndex}
          totalSteps={activeSteps.length}
        />
        <Summary state={state} onStartOver={handleStartOver} />
      </div>
    );
  }

  // Map-based steps (1-6)
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
    <div className="h-screen flex flex-col bg-gray-50">
      <StepIndicator
        currentStep={currentStepIndex}
        totalSteps={activeSteps.length}
      />

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          mode={getMapMode()}
          impactPoint={state.impactPoint}
          currentPath={currentPath}
          completedPaths={getCompletedPaths()}
          otherEntityPosition={otherEntityPos}
          restPositions={restPositions}
          onMapClick={handleMapClick}
          onPathUpdate={handlePathUpdate}
        />
      </div>

      {/* Bottom controls */}
      <BottomBar
        onNext={goToNextStep}
        onUndo={handleUndo}
        onReset={handleReset}
        canNext={canProceed()}
        canUndo={canUndo()}
        nextLabel={
          state.currentStep === 6 ? "Continue to speed" : "Continue"
        }
        instruction={getInstruction()}
      />
    </div>
  );
}
