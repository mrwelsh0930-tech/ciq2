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
import { AccelerationInput } from "./AccelerationInput";
import { AddressInput } from "./AddressInput";
import { Summary } from "./Summary";

const INITIAL_STATE: ReconstructionState = {
  currentStep: 0,
  collisionEntityType: null,
  impactPoint: null,
  mapBearingAtImpact: null,
  incidentAddress: null,
  incidentLocation: null,
  collisionTypeOverride: null,
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

// Figma design tokens
const CARD_SHADOW = "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px rgba(0,0,0,0.06)";

export function ReconstructionFlow() {
  const [state, setState] = useState<ReconstructionState>(INITIAL_STATE);
  const [currentPath, setCurrentPath] = useState<LatLng[]>([]);
  const [drawComplete, setDrawComplete] = useState(false);

  const isVehicle = state.collisionEntityType === "vehicle";
  const isStopped = state.yourVehicle.movementType === "stopped";

  // Determine which steps to show based on collision type and movement
  const activeSteps = STEPS.filter((step) => {
    // Skip "other path" for non-vehicle collisions
    if (!isVehicle && step.id === 7) return false;
    // Skip acceleration step if vehicle was stopped
    if (isStopped && step.id === 3) return false;
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
    if (drawComplete && (state.currentStep === 6 || state.currentStep === 7)) {
      return "idle";
    }
    switch (state.currentStep) {
      case 5:
        return state.impactPoint ? "idle" : "place-impact";
      case 6:
      case 7:
        return "draw-path";
      case 8:
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

  // Step 0: Address → Step 1: Collision type
  const handleAddressConfirm = (address: string, location: LatLng) => {
    setState((prev) => ({
      ...prev,
      incidentAddress: address,
      incidentLocation: location,
      currentStep: 1,
    }));
  };

  // Step 1: Collision type → Step 2: Speed
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
      currentStep: 2,
      collisionEntityType: type,
      otherEntity,
    }));
  };

  // Step 2: Speed → Step 3 (acceleration) or Step 4 (instruction) if stopped
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
      currentStep: data.movementType === "stopped" ? 4 : 3,
    }));
  };

  // Step 3: Acceleration → Step 4: Instruction
  const handleAccelerationComplete = (trend: "accelerating" | "decelerating" | "constant" | "unknown") => {
    setState((prev) => ({
      ...prev,
      yourVehicle: {
        ...prev.yourVehicle,
        speedTrend: trend,
      },
      currentStep: 4,
    }));
  };

  const handleMapClick = useCallback(
    (latlng: LatLng) => {
      if (state.currentStep === 5) {
        setState((prev) => ({ ...prev, impactPoint: latlng }));
      } else if (state.currentStep === 8) {
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

  const handleCollisionTypeOverride = (type: string) => {
    setState((prev) => ({
      ...prev,
      collisionTypeOverride: type,
    }));
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

    if (currentId === 6 && currentPath.length >= 2 && state.impactPoint) {
      const { pre, post } = splitPathAtImpact(currentPath, state.impactPoint);
      updatedState.yourVehicle = {
        ...updatedState.yourVehicle,
        preImpactPath: pre,
        postImpactPath: post,
      };
    } else if (currentId === 7 && isVehicle && currentPath.length >= 2 && state.impactPoint) {
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
      case 2:
      case 3:
        return false; // These steps have their own handlers
      case 5:
        return state.impactPoint !== null;
      case 6:
      case 7:
        return currentPath.length >= MIN_PATH_POINTS;
      case 8:
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

  const getCurrentPathColor = (): string => {
    if (state.currentStep === 7) return OTHER_PATH_COLOR;
    return YOUR_PATH_COLOR;
  };

  const getMapInstruction = (): string => {
    switch (state.currentStep) {
      case 5:
        return state.impactPoint
          ? "Tap to reposition, or confirm below."
          : "Please confirm the collision point";
      case 6:
        return drawComplete
          ? "Does this look like the path driven by your vehicle?"
          : "Draw the path driven by your vehicle, leading up to and after the collision.";
      case 7:
        return drawComplete
          ? "Does this look like the path driven by the other vehicle?"
          : "Draw the path driven by the other vehicle, leading up to and after the collision.";
      case 8:
        return "Tap where your vehicle came to a stop.";
      default:
        return "";
    }
  };

  const getMapSubInstruction = (): string | null => {
    switch (state.currentStep) {
      case 5:
        return state.impactPoint
          ? null
          : "Drag the map to reposition the pin. It\u2019s okay if it\u2019s not exact \u2014 just place it as close as you remember";
      case 6:
      case 7:
        return drawComplete ? null : "Make sure the path touches the collision point";
      default:
        return null;
    }
  };

  const hasYourPath = state.yourVehicle.preImpactPath.length > 0;
  const hasOtherPath = isVehicle && "preImpactPath" in state.otherEntity &&
    (state.otherEntity as VehicleData).preImpactPath.length > 0;

  // ─── Shared layout wrapper (Figma: #E2E8F0 bg, header, footer) ───
  const PageShell = ({
    children,
    showBack = true,
  }: {
    children: React.ReactNode;
    showBack?: boolean;
  }) => (
    <div className="fixed inset-0 flex flex-col bg-[#E2E8F0]">
      <AssuredHeader onBack={showBack ? goBack : undefined} showBack={showBack} />
      {children}
      <StepIndicator
        currentStep={currentStepIndex}
        totalSteps={activeSteps.length}
      />
    </div>
  );

  // ─── Figma card wrapper ───
  const Card = ({
    children,
    className = "",
    clipContent = false,
  }: {
    children: React.ReactNode;
    className?: string;
    clipContent?: boolean;
  }) => (
    <div
      className={`bg-white w-[342px] rounded-[6px] ${clipContent ? "overflow-hidden" : "overflow-visible"} ${className}`}
      style={{ boxShadow: CARD_SHADOW }}
    >
      {children}
    </div>
  );

  // ─── Figma primary button ───
  const PrimaryButton = ({
    children,
    onClick,
    disabled = false,
    className = "",
  }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-[55px] bg-[#1660F4] rounded-[8px] text-white text-[16px] font-normal leading-[24px] active:bg-[#1250D4] transition-colors disabled:bg-[#94A3B8] disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );

  // ─── Step 0: Address input (FIRST SCREEN) ───
  if (state.currentStep === 0) {
    return (
      <PageShell showBack={false}>
        <div className="flex-1 flex flex-col items-center justify-center py-6 overflow-y-auto">
          <Card className="py-8 px-8 flex flex-col gap-8 items-center">
            <AddressInput onConfirm={handleAddressConfirm} />
          </Card>
        </div>
      </PageShell>
    );
  }

  // ─── Step 1: Collision type ───
  if (state.currentStep === 1) {
    return (
      <PageShell>
        <div className="flex-1 flex flex-col items-center justify-center py-6 overflow-y-auto">
          <Card className="py-8 px-8 flex flex-col gap-8 items-center">
            <CollisionTypeSelector onSelect={handleCollisionTypeSelect} />
          </Card>
        </div>
      </PageShell>
    );
  }

  // ─── Step 2: Speed/movement ───
  if (state.currentStep === 2) {
    return (
      <PageShell>
        <div className="flex-1 flex flex-col items-center justify-center py-6 overflow-y-auto">
          <Card className="py-8 px-8 flex flex-col gap-8 items-center">
            <SpeedInput
              vehicleLabel="your vehicle"
              onComplete={handleSpeedComplete}
            />
          </Card>
        </div>
      </PageShell>
    );
  }

  // ─── Step 3: Acceleration ───
  if (state.currentStep === 3) {
    return (
      <PageShell>
        <div className="flex-1 flex flex-col items-center justify-center py-6 overflow-y-auto">
          <Card className="py-8 px-8 flex flex-col gap-8 items-center">
            <AccelerationInput onComplete={handleAccelerationComplete} />
          </Card>
        </div>
      </PageShell>
    );
  }

  // ─── Step 4: Pre-draw instruction ───
  if (state.currentStep === 4) {
    return (
      <PageShell>
        <div className="flex-1 flex flex-col items-center justify-center py-6 overflow-y-auto">
          <Card className="py-8 px-6 flex flex-col gap-8 items-center">
            <div className="flex flex-col gap-4 text-center w-full">
              <p className="font-medium text-[18px] leading-[28px] tracking-[-0.26px] text-[#475569]">
                Now we&apos;ll use a simple drawing tool to show what happened.
              </p>
              <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#475569]">
                Draw each vehicle&apos;s full path with your finger, leading up to and after the collision.
              </p>
            </div>

            {/* Illustration */}
            <div className="bg-[#F1F5F9] rounded-[8px] p-6 flex items-center justify-center w-full">
              <svg width="200" height="100" viewBox="0 0 200 100" fill="none">
                <line x1="20" y1="50" x2="120" y2="50" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round"/>
                <line x1="100" y1="20" x2="100" y2="90" stroke="#EF4444" strokeWidth="6" strokeLinecap="round"/>
                <circle cx="100" cy="50" r="8" fill="#EF4444" stroke="white" strokeWidth="3"/>
                <rect x="112" y="44" width="16" height="12" rx="2" fill="#3B82F6" stroke="white" strokeWidth="1.5"/>
                <rect x="94" y="76" width="12" height="16" rx="2" fill="#EF4444" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>

            <PrimaryButton onClick={goToNextStep}>
              Continue
            </PrimaryButton>
          </Card>
        </div>
      </PageShell>
    );
  }

  // ─── Step 9: Summary ───
  if (state.currentStep === 9) {
    return (
      <PageShell>
        <div className="flex-1 overflow-y-auto flex flex-col items-center py-6">
          <Card className="py-8 px-6">
            <Summary
              state={state}
              onStartOver={handleStartOver}
              onCollisionTypeOverride={handleCollisionTypeOverride}
            />
          </Card>
        </div>
      </PageShell>
    );
  }

  // ─── Map-based steps (5-8) ───
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

  const isDrawStep = state.currentStep === 6 || state.currentStep === 7;
  const showConfirmation = isDrawStep && drawComplete && currentPath.length >= MIN_PATH_POINTS;
  const subInstruction = getMapSubInstruction();

  return (
    <div className="fixed inset-0 flex flex-col bg-[#E2E8F0]">
      <AssuredHeader onBack={goBack} />

      {/* Card wrapping instruction + map (Figma pattern) */}
      <div className="flex-1 flex flex-col items-center py-6 min-h-0">
        <div
          className="bg-white w-[342px] rounded-[6px] overflow-hidden flex flex-col flex-1 min-h-0"
          style={{ boxShadow: CARD_SHADOW }}
        >
          {/* Instruction text */}
          <div className="px-8 py-6 text-center shrink-0">
            <p className="font-medium text-[18px] leading-[28px] tracking-[-0.26px] text-[#475569]">
              {getMapInstruction()}
            </p>
            {subInstruction && (
              <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#475569] mt-[10px]">
                {subInstruction}
              </p>
            )}
          </div>

          {/* Map fills remaining card space */}
          <div className="flex-1 relative min-h-0">
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
              centerOverride={state.incidentLocation}
            />

            {/* Vehicle label pills */}
            {(hasYourPath || (isDrawStep && state.currentStep === 7 && currentPath.length > 0) || hasOtherPath) && (
              <div className="absolute bottom-3 left-3 z-20 space-y-1.5">
                {(hasYourPath || (state.currentStep === 6 && currentPath.length > 0)) && (
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: YOUR_PATH_COLOR }} />
                    <span className="text-xs font-medium text-[#475569]">Your vehicle</span>
                  </div>
                )}
                {(hasOtherPath || (state.currentStep === 7 && currentPath.length > 0)) && (
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: OTHER_PATH_COLOR }} />
                    <span className="text-xs font-medium text-[#475569]">Other vehicle</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CTA button inside card for non-draw map steps */}
          {!isDrawStep && (
            <div className="shrink-0 px-6 py-4">
              <PrimaryButton onClick={goToNextStep} disabled={!canProceed()}>
                {state.currentStep === 5 ? "Confirm collision point" : "Continue"}
              </PrimaryButton>
            </div>
          )}
        </div>

        {/* Redraw/Confirm outside card for draw steps */}
        {showConfirmation && (
          <div className="w-[342px] mt-4 flex gap-3">
            <button
              onClick={handleRedraw}
              className="flex-1 h-[55px] bg-white border border-[#D4D4D4] rounded-[8px] text-[16px] font-normal text-[#475569] active:bg-[#F1F5F9] transition-colors"
              style={{ boxShadow: CARD_SHADOW }}
            >
              Redraw
            </button>
            <button
              onClick={goToNextStep}
              className="flex-1 h-[55px] bg-[#1660F4] rounded-[8px] text-[16px] font-normal text-white active:bg-[#1250D4] transition-colors"
            >
              Confirm
            </button>
          </div>
        )}

        {/* Spacer for draw steps before confirmation */}
        {isDrawStep && !showConfirmation && (
          <div className="w-[342px] mt-4 opacity-0 pointer-events-none">
            <div className="h-[55px]" />
          </div>
        )}
      </div>

      <StepIndicator
        currentStep={currentStepIndex}
        totalSteps={activeSteps.length}
      />
    </div>
  );
}
