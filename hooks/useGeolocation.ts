"use client";
import { useState, useEffect } from "react";

const DEFAULT = { lat: -34.46, lng: -58.53 };

export function useGeolocation() {
  const [coords, setCoords] = useState(DEFAULT);
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
      () => {
        setLoading(false);
      },
      { timeout: 5000 }
    );
  }, []);

  return { coords, loading };
}
