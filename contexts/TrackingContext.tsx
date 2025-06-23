import { useDb } from "@/db";
import { locations } from "@/db/schema";
import { getDistance } from "@/utils/location";
import logger from "@/utils/logger";
import { inArray } from "drizzle-orm";
import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { useShoppingList } from "../hooks/useShoppingList";
import { useStoreManager } from "../hooks/useStoreManager";

const GEOFENCE_TASK = "GEOFENCE_TASK";

export interface GeofencedStore {
  id: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
  distance: number;
}
interface TrackingContextType {
  isTracking: boolean;
  currentLocation: Location.LocationObject | null;
  geofencedStores: GeofencedStore[];
  isLoading: boolean;
  startTracking: () => Promise<void>;
  toggleTracking: () => void;
}

const TrackingContext = createContext<TrackingContextType | undefined>(
  undefined
);

export const useTracking = (): TrackingContextType => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error("useTracking must be used within a TrackingProvider");
  }
  return context;
};

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const db = useDb();
  const { shoppingItems } = useShoppingList();
  const { updateNearbyStores } = useStoreManager();
  const [isTracking, setIsTracking] = useState(true);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObject | null>(null);
  const [geofencedStores, setGeofencedStores] = useState<GeofencedStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stable refs to prevent cascading re-renders
  const shoppingItemsRef = useRef(shoppingItems ?? []);
  const updateInProgressRef = useRef(false);
  const lastCategoriesRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);

  // Only update shopping items ref when the actual categories change
  useEffect(() => {
    if (!shoppingItems) return;

    const categories = [
      ...new Set(shoppingItems.map((item) => item.primaryCategory.id)),
    ].sort();
    const categoriesKey = categories.join(",");

    logger.log(
      "[TrackingContext] Effect run: previous categories:",
      lastCategoriesRef.current,
      "new categories:",
      categoriesKey
    );

    // Only update if categories actually changed
    if (categoriesKey !== lastCategoriesRef.current) {
      logger.log("🔄 Categories changed:", categoriesKey);
      shoppingItemsRef.current = shoppingItems;
      lastCategoriesRef.current = categoriesKey;

      // Trigger update when categories change
      if (currentLocation && isTracking) {
        debouncedUpdateGeofences();
      }
    }
  }, [shoppingItems, currentLocation, isTracking]);

  const updateGeofences = useCallback(async () => {
    // Prevent concurrent executions
    if (updateInProgressRef.current || !currentLocation || !db) {
      logger.log("🚫 Skipping updateGeofences:", {
        updateInProgress: updateInProgressRef.current,
        hasLocation: !!currentLocation,
        hasDb: !!db,
      });
      return;
    }

    try {
      updateInProgressRef.current = true;
      logger.log("🔄 Starting updateGeofences");

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
        logger.log("🚫 No categories to track");
        setGeofencedStores([]);
        return;
      }

      logger.log("📍 Updating stores for categories:", categories);
      await updateNearbyStores(categories, currentLocation);

      const allStoresForCategories = await db.query.locations.findMany({
        where: inArray(locations.type, categories),
      });

      if (allStoresForCategories.length === 0) {
        logger.log("🚫 No stores found for categories");
        setGeofencedStores([]);
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
        logger.log("🚫 No nearby stores");
        setGeofencedStores([]);
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
      setGeofencedStores(nearbyStores);
      logger.log("✅ Geofences updated successfully");
    } catch (error) {
      logger.error("❌ Error updating geofences:", error);
    } finally {
      updateInProgressRef.current = false;
      setIsLoading(false);
    }
  }, [currentLocation, db, updateNearbyStores]);

  // Stable debounced function that doesn't recreate on every render
  const debouncedUpdateGeofences = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      updateGeofences();
      debounceTimerRef.current = null;
    }, 2000); // 2 second debounce
  }, [updateGeofences]);

  const startTracking = useCallback(async () => {
    let { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted") {
      Alert.alert("Permission to access location was denied");
      setIsLoading(false);
      return;
    }

    let { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      logger.log(
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
          logger.log("📍 Location updated");
          setCurrentLocation(location);
        }
      );
    };

    if (isTracking) {
      startLocationServices();
    }
    // TODO: disable tracking when we're toggled and persist the setting

    return () => {
      locationSubscription?.remove();
      // Clean up debounce timer on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [isTracking, startTracking]);

  // Handle location changes - trigger update when location changes significantly
  useEffect(() => {
    if (!currentLocation || !isTracking || !lastCategoriesRef.current) {
      return;
    }

    // Only trigger if we actually have shopping items with categories
    if (shoppingItemsRef.current.length === 0) {
      logger.log("🚫 No shopping items, skipping geofence update");
      return;
    }

    // Check if location actually changed significantly to avoid rapid-fire updates
    if (lastLocationRef.current) {
      const distance = getDistance(
        lastLocationRef.current.coords.latitude,
        lastLocationRef.current.coords.longitude,
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );

      // Only trigger if moved more than 50 meters
      if (distance < 50) {
        logger.log("📍 Location change too small, skipping geofence update");
        return;
      }
    }

    lastLocationRef.current = currentLocation;
    logger.log("📍 Location changed significantly, triggering geofence update");
    debouncedUpdateGeofences();
  }, [currentLocation, isTracking, debouncedUpdateGeofences]);

  const value = {
    isTracking,
    currentLocation,
    geofencedStores,
    isLoading,
    startTracking,
    toggleTracking: () => setIsTracking(!isTracking),
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
};
