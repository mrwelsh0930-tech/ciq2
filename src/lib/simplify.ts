import { LatLng } from "@/types/reconstruction";

/**
 * Simplify a polyline using Douglas-Peucker algorithm.
 * Reduces noisy touch input to a clean path.
 */
export function simplifyPath(points: LatLng[], tolerance: number = 0.00002): LatLng[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;

  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(point: LatLng, lineStart: LatLng, lineEnd: LatLng): number {
  const dx = lineEnd.lat - lineStart.lat;
  const dy = lineEnd.lng - lineStart.lng;

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.lat - lineStart.lat, 2) +
      Math.pow(point.lng - lineStart.lng, 2)
    );
  }

  const t = ((point.lat - lineStart.lat) * dx + (point.lng - lineStart.lng) * dy) / (dx * dx + dy * dy);
  const nearestLat = lineStart.lat + t * dx;
  const nearestLng = lineStart.lng + t * dy;

  return Math.sqrt(
    Math.pow(point.lat - nearestLat, 2) +
    Math.pow(point.lng - nearestLng, 2)
  );
}
