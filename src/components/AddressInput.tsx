"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { LatLng } from "@/types/reconstruction";

// Must match the exact same config used in MapView
const LIBRARIES: ("places")[] = ["places"];

interface AddressInputProps {
  onConfirm: (address: string, location: LatLng) => void;
}

export function AddressInput({ onConfirm }: AddressInputProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const dummyDivRef = useRef<HTMLDivElement>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    }
    if (isLoaded && dummyDivRef.current && !placesServiceRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(dummyDivRef.current);
    }
  }, [isLoaded]);

  const handleSearch = useCallback(
    (input: string) => {
      setQuery(input);
      if (!autocompleteServiceRef.current || input.length < 3) {
        setPredictions([]);
        return;
      }
      autocompleteServiceRef.current.getPlacePredictions(
        { input, types: ["address"] },
        (results) => {
          setPredictions(results || []);
        }
      );
    },
    []
  );

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;
    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: ["geometry", "formatted_address"] },
      (place) => {
        if (place?.geometry?.location) {
          const loc: LatLng = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          onConfirm(place.formatted_address || prediction.description, loc);
        }
      }
    );
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="font-medium text-[18px] leading-[28px] tracking-[-0.26px] text-[#475569] text-center mb-[10px]">
        Where did the incident happen?
      </h2>
      <p className="font-normal text-[14px] leading-[20px] tracking-[-0.09px] text-[#475569] text-center mb-8">
        Enter the address or intersection where the collision occurred.
      </p>

      <div className="w-full relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="e.g. 123 Main St, City, State"
          className="w-full h-[55px] px-4 border border-[#D4D4D4] rounded-[8px] text-[16px] text-[#475569] placeholder:text-[#94A3B8] focus:border-[#1660F4] focus:outline-none transition-colors"
        />

        {/* Predictions dropdown */}
        {predictions.length > 0 && (
          <div className="absolute top-[59px] left-0 right-0 bg-white rounded-[6px] shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.06)] border border-[#D4D4D4] z-10 overflow-hidden">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                onClick={() => handleSelect(p)}
                className="w-full text-left px-4 py-3 text-[14px] text-[#475569] hover:bg-[#F1F5F9] active:bg-[#E2E8F0] transition-colors border-b border-[#E2E8F0] last:border-b-0"
              >
                {p.description}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hidden div for PlacesService */}
      <div ref={dummyDivRef} className="hidden" />
    </div>
  );
}
