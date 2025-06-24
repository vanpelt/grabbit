import { storeMapping } from "@/data/stores";
import { useDb } from "@/db";
import { locations } from "@/db/schema";
import { getDistance } from "@/utils/location";
import logger from "@/utils/logger";
import Constants from "expo-constants";
import * as Location from "expo-location";
import Storage from "expo-sqlite/kv-store";
import { useRef } from "react";

const MAPBOX_API_KEY = Constants.expoConfig?.extra?.MAPBOX_API_KEY;

// Rate limiting configuration
const MAX_REQUESTS_PER_SECOND = 10;
const RATE_LIMIT_WINDOW_MS = 1000;

export function useStoreManager() {
  const db = useDb();
  const requestTimestampsRef = useRef<number[]>([]);
  const activeRequestsRef = useRef<Set<string>>(new Set());

  // Rate limiter function
  const isRateLimited = () => {
    const now = Date.now();
    // Remove timestamps older than our window
    requestTimestampsRef.current = requestTimestampsRef.current.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    // Check if we're over the limit
    if (requestTimestampsRef.current.length >= MAX_REQUESTS_PER_SECOND) {
      logger.warn(
        `⚠️ RATE LIMIT EXCEEDED: More than ${MAX_REQUESTS_PER_SECOND} MapBox API requests per second! Request dropped to avoid excessive charges.`
      );
      return true;
    }

    // Add current timestamp and allow the request
    requestTimestampsRef.current.push(now);
    return false;
  };

  const updateNearbyStores = async (
    categories: string[],
    currentLocation: Location.LocationObject
  ) => {
    if (!db) {
      logger.log("🚫 useStoreManager: db is not available, returning.");
      return;
    }

    if (!categories || categories.length === 0) {
      logger.log("🚫 useStoreManager: no categories provided, returning.");
      return;
    }

    // Create a unique key for this request to prevent duplicates
    const requestKey = `${categories
      .sort()
      .join(",")}:${currentLocation.coords.latitude.toFixed(
      4
    )},${currentLocation.coords.longitude.toFixed(4)}`;

    if (activeRequestsRef.current.has(requestKey)) {
      logger.log(
        "🚫 useStoreManager: identical request already in progress, skipping:",
        requestKey
      );
      return;
    }

    // Mark request as active right away
    activeRequestsRef.current.add(requestKey);

    try {
      const lastUpdateTimestampStr = await Storage.getItem(
        "lastUpdateTimestamp"
      );
      const lastUpdateLocationStr = await Storage.getItem("lastUpdateLocation");
      const lastUpdateCategoriesStr = await Storage.getItem(
        "lastUpdateCategories"
      );
      const now = Date.now();

      if (
        lastUpdateTimestampStr &&
        lastUpdateLocationStr &&
        lastUpdateCategoriesStr
      ) {
        const lastUpdateTimestamp = Number(lastUpdateTimestampStr);
        const lastUpdateLocation: Location.LocationObject = JSON.parse(
          lastUpdateLocationStr
        );
        const lastUpdateCategories = JSON.parse(lastUpdateCategoriesStr);
        const timeDiffHours = (now - lastUpdateTimestamp) / (1000 * 60 * 60);
        const distanceMiles = getDistance(
          lastUpdateLocation.coords.latitude,
          lastUpdateLocation.coords.longitude,
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );

        // Check if categories are the same
        const categoriesChanged =
          JSON.stringify(categories.sort()) !==
          JSON.stringify(lastUpdateCategories.sort());

        if (distanceMiles < 1 && timeDiffHours < 24 && !categoriesChanged) {
          logger.log(
            "⏭️ Skipping update: location nearby, updated recently, and categories unchanged."
          );
          return;
        }

        if (
          distanceMiles >= 1 &&
          timeDiffHours * 60 < 5 &&
          !categoriesChanged
        ) {
          logger.log(
            "⏭️ Skipping update: location changed but updated too recently and categories unchanged."
          );
          return;
        }
      }

      // Check rate limiting before proceeding
      if (isRateLimited()) {
        return;
      }

      logger.log(
        "🔄 Updating nearby stores for categories:",
        categories,
        "at location:",
        `${currentLocation.coords.latitude.toFixed(
          4
        )}, ${currentLocation.coords.longitude.toFixed(4)}`
      );

      const mapboxCategories = categories.flatMap(
        (category) => storeMapping[category] || []
      );

      if (mapboxCategories.length === 0) {
        logger.log(
          "🚫 useStoreManager: no mapbox categories found for given item categories, returning.",
          categories
        );
        return;
      }

      const uniqueMapboxCategories = [...new Set(mapboxCategories)];

      logger.log("🔍 Fetching for mapbox categories:", uniqueMapboxCategories);

      const allNewLocations: (typeof locations.$inferInsert)[] = [];

      for (const mapboxCategory of uniqueMapboxCategories) {
        // Check rate limiting before each API call
        if (isRateLimited()) {
          logger.log("🚫 Breaking out of category loop due to rate limiting");
          break;
        }

        console.log(
          "Fetching for mapbox category",
          mapboxCategory,
          MAPBOX_API_KEY?.slice(0, 4)
        );
        const response = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/category/${mapboxCategory}?access_token=${MAPBOX_API_KEY}&proximity=${currentLocation.coords.longitude},${currentLocation.coords.latitude}`
        );
        const data = await response.json();

        if (data.features) {
          const ourCategory = Object.keys(storeMapping).find((key) =>
            storeMapping[key].includes(mapboxCategory)
          );

          if (ourCategory) {
            const newLocations = data.features.map((feature: any) => ({
              name: feature.properties.name,
              lat: feature.properties.coordinates.latitude,
              lng: feature.properties.coordinates.longitude,
              type: ourCategory,
              mapboxId: feature.properties.mapbox_id,
            }));
            allNewLocations.push(...newLocations);
          } else {
            logger.log(
              "🚫 useStoreManager: no ourCategory found for mapboxCategory",
              mapboxCategory
            );
          }
        }
      }

      if (allNewLocations.length > 0) {
        try {
          await db
            .insert(locations)
            .values(allNewLocations)
            .onConflictDoNothing();
          logger.log(`✅ Inserted ${allNewLocations.length} new locations.`);
          await Storage.setItem("lastUpdateTimestamp", String(now));
          await Storage.setItem(
            "lastUpdateLocation",
            JSON.stringify(currentLocation)
          );
          await Storage.setItem(
            "lastUpdateCategories",
            JSON.stringify(categories)
          );
        } catch (e) {
          logger.error("❌ Error inserting locations", e);
        }
      }
    } finally {
      // Always clean up the active request
      activeRequestsRef.current.delete(requestKey);
    }
  };

  return { updateNearbyStores };
}
