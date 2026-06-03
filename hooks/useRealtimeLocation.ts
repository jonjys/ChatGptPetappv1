"use client";

import { useState, useEffect } from "react";

type Coords = { lat: number; lng: number } | null;

export function useRealtimeLocation(): { coords: Coords; loading: boolean } {
  const [coords, setCoords] = useState<Coords>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 5000 }
    );
  }, []);

  return { coords, loading };
}
