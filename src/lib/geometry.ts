import { LatLng } from "@/types/reconstruction";

/**
 * Calculate bearing between two points in degrees (0-360)
 */
export function calculateBearing(from: LatLng, to: LatLng): number {
  const dLng = toRad(to.lng - from.lng);
  const fromLat = toRad(from.lat);
  const toLat = toRad(to.lat);

  const y = Math.sin(dLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Calculate distance between two points in meters
 */
export function calculateDistance(from: LatLng, to: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate approach angle between two bearings
 */
export function calculateApproachAngle(
  bearing1: number,
  bearing2: number
): number {
  let angle = Math.abs(bearing1 - bearing2);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/**
 * Classify collision type based on approach angle
 */
export function classifyCollision(approachAngle: number): string {
  if (approachAngle <= 30 || approachAngle >= 150) return "Rear-end";
  if (approachAngle >= 60 && approachAngle <= 120) return "T-bone";
  return "Sideswipe";
}

/**
 * Convert approach angle to PDOF clock approximation
 */
export function toPDOFClock(approachAngle: number): number {
  const clock = Math.round(approachAngle / 30) % 12;
  return clock === 0 ? 12 : clock;
}

/**
 * Snap a point to the nearest point on a polyline segment
 */
export function snapToPath(point: LatLng, path: LatLng[]): LatLng {
  if (path.length === 0) return point;
  if (path.length === 1) return path[0];

  let minDist = Infinity;
  let closest = path[0];

  for (let i = 0; i < path.length - 1; i++) {
    const snapped = nearestPointOnSegment(point, path[i], path[i + 1]);
    const dist = calculateDistance(point, snapped);
    if (dist < minDist) {
      minDist = dist;
      closest = snapped;
    }
  }

  return closest;
}

function nearestPointOnSegment(
  point: LatLng,
  a: LatLng,
  b: LatLng
): LatLng {
  const dx = b.lat - a.lat;
  const dy = b.lng - a.lng;
  const len2 = dx * dx + dy * dy;

  if (len2 === 0) return a;

  let t = ((point.lat - a.lat) * dx + (point.lng - a.lng) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  return {
    lat: a.lat + t * dx,
    lng: a.lng + t * dy,
  };
}

/**
 * Get the last bearing of a path (direction of final segment)
 */
export function getPathEndBearing(path: LatLng[]): number | null {
  if (path.length < 2) return null;
  return calculateBearing(path[path.length - 2], path[path.length - 1]);
}

/**
 * Get the first bearing of a path (direction of first segment)
 */
export function getPathStartBearing(path: LatLng[]): number | null {
  if (path.length < 2) return null;
  return calculateBearing(path[0], path[1]);
}

/**
 * Check if a point is within threshold distance of another point (in meters)
 */
export function isWithinThreshold(
  a: LatLng,
  b: LatLng,
  thresholdMeters: number
): boolean {
  return calculateDistance(a, b) <= thresholdMeters;
}

/**
 * Split a drawn path into pre-impact and post-impact at the closest point to impact
 */
export function splitPathAtImpact(
  path: LatLng[],
  impact: LatLng
): { pre: LatLng[]; post: LatLng[] } {
  if (path.length < 2) return { pre: path, post: [] };

  let minDist = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < path.length; i++) {
    const dist = calculateDistance(path[i], impact);
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }

  // Split: pre = start to closest (snap end to impact), post = closest to end (snap start to impact)
  const pre = [...path.slice(0, closestIdx + 1)];
  pre[pre.length - 1] = impact;

  const post = [impact, ...path.slice(closestIdx + 1)];

  return { pre, post };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
