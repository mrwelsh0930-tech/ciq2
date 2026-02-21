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
  { id: 1, title: "Impact point", description: "Tap where the vehicles made contact" },
  { id: 2, title: "Your approach", description: "Draw your path before the crash" },
  { id: 3, title: "Other approach", description: "Draw the other path before the crash" },
  { id: 4, title: "Your movement after", description: "Draw what happened after the crash" },
  { id: 5, title: "Other movement after", description: "Draw other movement after the crash" },
  { id: 6, title: "Rest position", description: "Where did your vehicle come to rest?" },
  { id: 7, title: "Speed", description: "How fast were you going?" },
  { id: 8, title: "Summary", description: "Review your reconstruction" },
];
