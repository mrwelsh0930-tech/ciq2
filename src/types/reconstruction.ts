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
  speedTrend: "accelerating" | "decelerating" | "constant" | "unknown" | null;
}

export interface OtherEntityData {
  type: CollisionEntityType;
  entitySubType: string | null;
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
  incidentAddress: string | null;
  incidentLocation: LatLng | null;
  collisionTypeOverride: string | null;
  isParkingArea: boolean | null;
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
  speedTrend: null,
};

export const STEPS = [
  { id: 0, title: "Incident location", description: "Where did the incident happen?" },
  { id: 1, title: "What happened?", description: "Tell us what you collided with" },
  { id: 2, title: "Before the collision", description: "How were you moving?" },
  { id: 3, title: "Speed change", description: "Were you speeding up or slowing down?" },
  { id: 4, title: "Parking area", description: "Was this in a parking area?" },
  { id: 5, title: "Drawing tool", description: "How this works" },
  { id: 6, title: "Collision point", description: "Please confirm the collision point" },
  { id: 7, title: "Your path", description: "Draw your vehicle's path" },
  { id: 8, title: "Other path", description: "Draw the other vehicle's path" },
  { id: 9, title: "Rest position", description: "Where did your vehicle end up?" },
  { id: 10, title: "Summary", description: "Review your reconstruction" },
];
