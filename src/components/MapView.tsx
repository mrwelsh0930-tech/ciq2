"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import { LatLng } from "@/types/reconstruction";

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

const SNAP_THRESHOLD_PX = 30;

export type MapMode =
  | "idle"
  | "place-impact"
  | "draw-pre-path"
  | "draw-post-path"
  | "place-rest"
  | "place-entity";

interface MapViewProps {
  mode: MapMode;
  impactPoint: LatLng | null;
  currentPath: LatLng[];
  completedPaths: {
    path: LatLng[];
    color: string;
  }[];
  otherEntityPosition: LatLng | null;
  restPositions: (LatLng | null)[];
  onMapClick: (latlng: LatLng) => void;
  onPathUpdate: (path: LatLng[]) => void;
  vehicleLabels?: string[];
}

export function MapView({
  mode,
  impactPoint,
  currentPath,
  completedPaths,
  otherEntityPosition,
  restPositions,
  onMapClick,
  onPathUpdate,
  vehicleLabels = ["You", "Other"],
}: MapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Use refs to avoid stale closures in Google Maps event handlers
  const modeRef = useRef(mode);
  const impactPointRef = useRef(impactPoint);
  const currentPathRef = useRef(currentPath);
  const onMapClickRef = useRef(onMapClick);
  const onPathUpdateRef = useRef(onPathUpdate);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { impactPointRef.current = impactPoint; }, [impactPoint]);
  useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onPathUpdateRef.current = onPathUpdate; }, [onPathUpdate]);

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
        () => {
          // Silently fail - use default center
        }
      );
    }
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  // Stable click handler that reads from refs
  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const currentMode = modeRef.current;
      const impact = impactPointRef.current;
      const path = currentPathRef.current;

      const clickedPoint: LatLng = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      if (currentMode === "place-impact" || currentMode === "place-rest" || currentMode === "place-entity") {
        onMapClickRef.current(clickedPoint);
        return;
      }

      if (currentMode === "draw-pre-path" || currentMode === "draw-post-path") {
        // Check if click is near impact point for snapping
        if (impact && mapRef.current) {
          const projection = mapRef.current.getProjection();
          if (projection) {
            const impactPixel = projection.fromLatLngToPoint(
              new google.maps.LatLng(impact.lat, impact.lng)
            );
            const clickPixel = projection.fromLatLngToPoint(
              new google.maps.LatLng(clickedPoint.lat, clickedPoint.lng)
            );

            if (impactPixel && clickPixel) {
              const zoom = mapRef.current.getZoom() || DEFAULT_ZOOM;
              const scale = Math.pow(2, zoom);
              const dx = (impactPixel.x - clickPixel.x) * scale;
              const dy = (impactPixel.y - clickPixel.y) * scale;
              const distPx = Math.sqrt(dx * dx + dy * dy);

              if (distPx < SNAP_THRESHOLD_PX) {
                onPathUpdateRef.current([...path, impact]);
                return;
              }
            }
          }
        }

        onPathUpdateRef.current([...path, clickedPoint]);
      }
    },
    [] // Empty deps - reads everything from refs
  );

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

  const pathColors = {
    preYou: "#3B82F6",
    preOther: "#F59E0B",
    postYou: "#6366F1",
    postOther: "#F97316",
    current: "#10B981",
  };

  return (
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
      {/* Impact point marker */}
      {impactPoint && (
        <Marker
          position={impactPoint}
          icon={IMPACT_PULSE_ICON}
          title="Impact point"
          zIndex={100}
        />
      )}

      {/* Completed paths */}
      {completedPaths.map((cp, i) => (
        <Polyline
          key={`completed-${i}`}
          path={cp.path}
          options={{
            strokeColor: cp.color,
            strokeWeight: 4,
            strokeOpacity: 0.8,
            geodesic: true,
          }}
        />
      ))}

      {/* Current drawing path */}
      {mapReady && currentPath.length > 0 && (
        <Polyline
          path={currentPath}
          options={{
            strokeColor: pathColors.current,
            strokeWeight: 4,
            strokeOpacity: 0.9,
            geodesic: true,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
                  scale: 3,
                  strokeColor: pathColors.current,
                },
                offset: "100%",
              },
            ],
          }}
        />
      )}

      {/* Current path point markers */}
      {mapReady && currentPath.map((point, i) => (
        <Marker
          key={`current-${i}`}
          position={point}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: pathColors.current,
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          }}
          zIndex={50}
        />
      ))}

      {/* Other entity position (for object/animal/property) */}
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
  );
}
