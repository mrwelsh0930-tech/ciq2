export type CollisionEntityType = "vehicle" | "object" | "animal" | "property";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface VehicleData {
  id: string;
  label: string;
  preImpactPath: LatLng[];
  postImpactPath: LatLng[];
  restPosition: LatLng | null;
  approachBearing: number | null;
  separationBearing: number | null;
  headingChange: number | null;
  speedEstimate: number | null;
  movementType: "forward" | "reverse" | "stopped" | null;
}

export interface OtherEntityData {
  type: CollisionEntityType;
  label: string;
  position: LatLng | null;
  description: string;
}

export interface DerivedData {
  approachAngle: number | null;
  separationAngle: number | null;
  collisionType: string | null;
  pdofClockApprox: number | null;
}

export interface ReconstructionState {
  currentStep: number;
  collisionEntityType: CollisionEntityType | null;
  impactPoint: LatLng | null;
  mapBearingAtImpact: number | null;
  yourVehicle: VehicleData;
  otherEntity: VehicleData | OtherEntityData;
  derived: DerivedData;
}

export const INITIAL_VEHICLE_DATA: VehicleData = {
  id: "",
  label: "",
  preImpactPath: [],
  postImpactPath: [],
  restPosition: null,
  approachBearing: null,
  separationBearing: null,
  headingChange: null,
  speedEstimate: null,
  movementType: null,
};

export const STEPS = [
  { id: 0, title: "What happened?", description: "Tell us what you collided with" },
  { id: 1, title: "Before the crash", description: "How were you moving?" },
  { id: 2, title: "Impact point", description: "Tap where the collision happened" },
  { id: 3, title: "Your path", description: "Draw your vehicle's path" },
  { id: 4, title: "Other path", description: "Draw the other vehicle's path" },
  { id: 5, title: "Rest position", description: "Where did your vehicle end up?" },
  { id: 6, title: "Summary", description: "Review your reconstruction" },
];
