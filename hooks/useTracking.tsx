import { useDb } from "@/db";
import { locations } from "@/db/schema";
import { getDistance } from "@/utils/location";
import { inArray } from "drizzle-orm";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { ShoppingItem } from "./useShoppingList";
import { useStoreManager } from "./useStoreManager";

const GEOFENCE_TASK = "GEOFENCE_TASK";

export const useTracking = (shoppingItems?: ShoppingItem[]) => {
  const db = useDb();
  const { updateNearbyStores } = useStoreManager();
  const [isTracking, setIsTracking] = useState(true);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObject | null>(null);
  const shoppingItemsRef = useRef(shoppingItems ?? []);
  const updateInProgressRef = useRef(false);

  useEffect(() => {
    if (shoppingItems) {
      shoppingItemsRef.current = shoppingItems;
    }
  }, [shoppingItems]);

  const updateGeofences = useCallback(async () => {
    // Prevent concurrent executions
    if (updateInProgressRef.current || !currentLocation || !db) {
      return;
    }

    try {
      updateInProgressRef.current = true;

      const hasGeofences = await Location.hasStartedGeofencingAsync(
        GEOFENCE_TASK
      );
      if (hasGeofences) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK);
      }

      const categories = [
        ...new Set(
          shoppingItemsRef.current.map((item) => item.primaryCategory.id)
        ),
      ];
      if (categories.length === 0) {
        return;
      }

      await updateNearbyStores(categories, currentLocation);

      const allStoresForCategories = await db.query.locations.findMany({
        where: inArray(locations.type, categories),
      });

      if (allStoresForCategories.length === 0) {
        return;
      }

      const allStoresWithDistance = allStoresForCategories
        .map((store) => ({
          ...store,
          distance: getDistance(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude,
            store.lat,
            store.lng
          ),
        }))
        .sort((a, b) => a.distance - b.distance);

      const nearbyStores = allStoresWithDistance.slice(0, 20);

      if (nearbyStores.length === 0) {
        return;
      }

      const geofenceRegions = nearbyStores.map((store) => ({
        identifier: store.name,
        latitude: store.lat,
        longitude: store.lng,
        radius: 100,
        notifyOnEnter: true,
        notifyOnExit: true,
      }));

      await Location.startGeofencingAsync(GEOFENCE_TASK, geofenceRegions);
    } finally {
      updateInProgressRef.current = false;
    }
  }, [currentLocation, db, updateNearbyStores]);

  // Debounce the updateGeofences function to prevent rapid consecutive calls
  const debouncedUpdateGeofences = useMemo(() => {
    let timeoutId: NodeJS.Timeout | number | null = null;
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateGeofences();
        timeoutId = null;
      }, 2000); // 2 second debounce
    };
  }, [updateGeofences]);

  const startTracking = useCallback(async () => {
    let { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted") {
      Alert.alert("Permission to access location was denied");
      return;
    }

    let { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      console.log(
        "Permission to access background location was denied. Proceeding with foreground tracking only."
      );
    }

    setIsTracking(true);
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationServices = async () => {
      await startTracking();
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        (location) => {
          setCurrentLocation(location);
          // Don't call updateGeofences directly here - will be handled by the useEffect below
        }
      );
    };

    if (isTracking) {
      startLocationServices();
    }
    // TODO: disable tracking when we're toggled and persist the setting

    return () => {
      locationSubscription?.remove();
    };
  }, [isTracking, startTracking]);

  // Handle location and shopping list changes
  useEffect(() => {
    if (currentLocation && isTracking && shoppingItemsRef.current.length > 0) {
      debouncedUpdateGeofences();
    }
  }, [currentLocation, isTracking, debouncedUpdateGeofences]);

  return {
    isTracking,
    currentLocation,
    startTracking,
    toggleTracking: () => setIsTracking(!isTracking),
  };
};
