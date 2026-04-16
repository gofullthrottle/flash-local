"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

type UseGeolocationOptions = {
  enableHighAccuracy?: boolean;
  // How often to record a breadcrumb (ms)
  intervalMs?: number;
  onPosition?: (pos: GeoPosition) => void;
  onError?: (error: GeolocationPositionError) => void;
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    intervalMs = 15000,
    onPosition,
    onError,
  } = options;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPositionRef = useRef(onPosition);
  const onErrorRef = useRef(onError);

  onPositionRef.current = onPosition;
  onErrorRef.current = onError;

  const getCurrentPosition = useCallback(() => {
    return new Promise<GeoPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPos: GeoPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setPosition(geoPos);
          setError(null);
          resolve(geoPos);
        },
        (err) => {
          setError(err.message);
          reject(err);
        },
        { enableHighAccuracy }
      );
    });
  }, [enableHighAccuracy]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setTracking(true);

    // Continuous watch for real-time position display
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const geoPos: GeoPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setPosition(geoPos);
        setError(null);
      },
      (err) => {
        setError(err.message);
        onErrorRef.current?.(err);
      },
      { enableHighAccuracy, maximumAge: 10000, timeout: 30000 }
    );

    // Interval-based breadcrumb recording
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPos: GeoPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          onPositionRef.current?.(geoPos);
        },
        () => {
          // Silently skip — position will be picked up next interval
        },
        { enableHighAccuracy }
      );
    }, intervalMs);
  }, [enableHighAccuracy, intervalMs]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    position,
    error,
    tracking,
    getCurrentPosition,
    startTracking,
    stopTracking,
  };
}
