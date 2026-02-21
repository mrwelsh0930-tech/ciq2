"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import { LatLng } from "@/types/reconstruction";
import { simplifyPath } from "@/lib/simplify";
import { calculateBearing } from "@/lib/geometry";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };
const DEFAULT_ZOOM = 18;

const IMPACT_PULSE_ICON = {
  path: 0, // google.maps.SymbolPath.CIRCLE
  scale: 14,
  fillColor: "#EF4444",
  fillOpacity: 0.8,
  strokeColor: "#FFFFFF",
  strokeWeight: 3,
};

// Simple top-down car shape (pointing north by default)
const CAR_SVG_PATH = "M -4,-8 L 4,-8 L 5,-5 L 5,6 L 4,8 L -4,8 L -5,6 L -5,-5 Z";

export type MapMode =
  | "idle"
  | "place-impact"
  | "draw-path"
  | "place-rest";

interface MapViewProps {
  mode: MapMode;
  impactPoint: LatLng | null;
  currentPath: LatLng[];
  currentPathColor?: string;
  completedPaths: {
    path: LatLng[];
    color: string;
  }[];
  otherEntityPosition: LatLng | null;
  restPositions: (LatLng | null)[];
  onMapClick: (latlng: LatLng) => void;
  onPathUpdate: (path: LatLng[]) => void;
  onDrawEnd?: () => void;
  vehicleLabels?: string[];
}

export function MapView({
  mode,
  impactPoint,
  currentPath,
  currentPathColor = "#10B981",
  completedPaths,
  otherEntityPosition,
  restPositions,
  onMapClick,
  onPathUpdate,
  onDrawEnd,
  vehicleLabels = ["You", "Other"],
}: MapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const isDrawingRef = useRef(false);
  const drawPointsRef = useRef<LatLng[]>([]);

  // Refs for stable access in event handlers
  const modeRef = useRef(mode);
  const onMapClickRef = useRef(onMapClick);
  const onPathUpdateRef = useRef(onPathUpdate);
  const onDrawEndRef = useRef(onDrawEnd);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onPathUpdateRef.current = onPathUpdate; }, [onPathUpdate]);
  useEffect(() => { onDrawEndRef.current = onDrawEnd; }, [onDrawEnd]);

  const isDrawMode = mode === "draw-path";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {}
      );
    }
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  // Convert screen pixel to lat/lng using map bounds
  const pixelToLatLng = useCallback((clientX: number, clientY: number): LatLng | null => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return null;

    const rect = overlay.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const bounds = map.getBounds();
    if (!bounds) return null;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const lat = ne.lat() - (y / rect.height) * (ne.lat() - sw.lat());
    const lng = sw.lng() + (x / rect.width) * (ne.lng() - sw.lng());

    return { lat, lng };
  }, []);

  // Drawing handlers
  const handleDrawStart = useCallback((clientX: number, clientY: number) => {
    if (modeRef.current !== "draw-path") return;
    isDrawingRef.current = true;
    const point = pixelToLatLng(clientX, clientY);
    if (point) {
      drawPointsRef.current = [point];
      onPathUpdateRef.current([point]);
    }
  }, [pixelToLatLng]);

  const handleDrawMove = useCallback((clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return;
    const point = pixelToLatLng(clientX, clientY);
    if (point) {
      drawPointsRef.current.push(point);
      const simplified = simplifyPath(drawPointsRef.current, 0.000005);
      onPathUpdateRef.current(simplified);
    }
  }, [pixelToLatLng]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const simplified = simplifyPath(drawPointsRef.current, 0.00001);
    onPathUpdateRef.current(simplified);
    drawPointsRef.current = [];
    if (simplified.length >= 2 && onDrawEndRef.current) {
      onDrawEndRef.current();
    }
  }, []);

  // Attach touch/mouse events to drawing overlay
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const onTouchStart = (e: TouchEvent) => {
      if (modeRef.current !== "draw-path") return;
      e.preventDefault();
      handleDrawStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      handleDrawMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleDrawEnd();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (modeRef.current !== "draw-path") return;
      handleDrawStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      handleDrawMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handleDrawEnd();
    };

    overlay.addEventListener("touchstart", onTouchStart, { passive: false });
    overlay.addEventListener("touchmove", onTouchMove, { passive: false });
    overlay.addEventListener("touchend", onTouchEnd, { passive: false });
    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);

    return () => {
      overlay.removeEventListener("touchstart", onTouchStart);
      overlay.removeEventListener("touchmove", onTouchMove);
      overlay.removeEventListener("touchend", onTouchEnd);
      overlay.removeEventListener("mousedown", onMouseDown);
      overlay.removeEventListener("mousemove", onMouseMove);
      overlay.removeEventListener("mouseup", onMouseUp);
    };
  }, [handleDrawStart, handleDrawMove, handleDrawEnd, isDrawMode]);

  // Disable map dragging when in draw mode
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({ draggable: !isDrawMode });
    }
  }, [isDrawMode]);

  // Handle taps for placement modes only
  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const currentMode = modeRef.current;
      if (currentMode === "place-impact" || currentMode === "place-rest") {
        onMapClickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    },
    []
  );

  // Helper: get car icon for a path endpoint
  const getCarIcon = (color: string, path: LatLng[]) => {
    if (path.length < 2) return null;
    const bearing = calculateBearing(
      path[path.length - 2],
      path[path.length - 1]
    );
    return {
      path: CAR_SVG_PATH,
      scale: 2,
      fillColor: color,
      fillOpacity: 0.95,
      strokeColor: "#FFFFFF",
      strokeWeight: 2,
      rotation: bearing,
    };
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center p-4">
          <p className="text-red-600 font-medium">Failed to load map</p>
          <p className="text-sm text-gray-500 mt-1">Check your API key configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="animate-pulse text-gray-500">Loading map...</div>
      </div>
    );
  }

  const center = userLocation || DEFAULT_CENTER;

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={impactPoint || center}
        zoom={DEFAULT_ZOOM}
        onLoad={onMapLoad}
        onClick={handleMapClick}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeId: "satellite",
          gestureHandling: "greedy",
          clickableIcons: false,
        }}
      >
        {/* Impact point */}
        {impactPoint && (
          <Marker
            position={impactPoint}
            icon={IMPACT_PULSE_ICON}
            title="Impact point"
            zIndex={100}
          />
        )}

        {/* Completed paths + car icons at endpoints */}
        {completedPaths.map((cp, i) => (
          <Polyline
            key={`completed-${i}`}
            path={cp.path}
            options={{
              strokeColor: cp.color,
              strokeWeight: 6,
              strokeOpacity: 0.85,
              geodesic: true,
            }}
          />
        ))}
        {mapReady && completedPaths.map((cp, i) => {
          const carIcon = getCarIcon(cp.color, cp.path);
          if (!carIcon) return null;
          return (
            <Marker
              key={`car-completed-${i}`}
              position={cp.path[cp.path.length - 1]}
              icon={carIcon}
              zIndex={60}
            />
          );
        })}

        {/* Current drawing path */}
        {mapReady && currentPath.length > 1 && (
          <Polyline
            path={currentPath}
            options={{
              strokeColor: currentPathColor,
              strokeWeight: 6,
              strokeOpacity: 0.9,
              geodesic: true,
            }}
          />
        )}

        {/* Car icon at end of current path */}
        {mapReady && currentPath.length > 1 && (() => {
          const carIcon = getCarIcon(currentPathColor, currentPath);
          if (!carIcon) return null;
          return (
            <Marker
              position={currentPath[currentPath.length - 1]}
              icon={carIcon}
              zIndex={60}
            />
          );
        })()}

        {/* Start marker for current path */}
        {mapReady && currentPath.length > 0 && (
          <Marker
            position={currentPath[0]}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: currentPathColor,
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            }}
            zIndex={50}
          />
        )}

        {/* Other entity position */}
        {otherEntityPosition && (
          <Marker
            position={otherEntityPosition}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#F59E0B",
              fillOpacity: 0.9,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            }}
            title="Other entity"
            zIndex={90}
          />
        )}

        {/* Rest position markers */}
        {restPositions.map(
          (pos, i) =>
            pos && (
              <Marker
                key={`rest-${i}`}
                position={pos}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#8B5CF6",
                  fillOpacity: 0.9,
                  strokeColor: "#FFFFFF",
                  strokeWeight: 2,
                }}
                title={`${vehicleLabels[i]} rest position`}
                zIndex={80}
              />
            )
        )}
      </GoogleMap>

      {/* Drawing overlay — always rendered, only intercepts in draw mode */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 ${isDrawMode ? "z-10" : "-z-10 pointer-events-none"}`}
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
