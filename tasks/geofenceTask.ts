import { getDistance } from "@/utils/location";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { openDatabaseSync } from "expo-sqlite";
import * as TaskManager from "expo-task-manager";
import logger from "@/utils/logger";

const GEOFENCE_TASK = "GEOFENCE_TASK";

export async function handleGeofenceEvent({ data, error }: any) {
  if (error) {
    logger.error("❌ [GeofenceTask] error:", error);
    return;
  }

  if (data) {
    const { eventType, region } = data as {
      eventType: Location.GeofencingEventType;
      region: {
        identifier: string;
        radius: number;
        latitude: number;
        longitude: number;
        state: Location.GeofencingRegionState;
      };
    };

    // Only handle ENTER events
    const action =
      eventType === Location.GeofencingEventType.Enter ? "ENTER" : "EXIT";
    if (action !== "ENTER") {
      return;
    }

    logger.log(`🏪 ${action} geofence at:`, region.latitude, region.longitude);

    try {
      // Import schema for database access
      const schema = await import("@/db/schema");

      // Access database in readonly mode with schema?
      const db = drizzle(openDatabaseSync("grabbit.db"), {
        schema,
      });

      // Get all locations from our database
      const allLocations = await db.query.locations.findMany();

      // Find locations within 50 meters of the geofence trigger point
      const nearbyLocations = allLocations.filter((location) => {
        const distance = getDistance(
          region.latitude,
          region.longitude,
          location.lat,
          location.lng
        );
        return distance <= 50; // within 50 meters
      });

      if (nearbyLocations.length === 0) {
        logger.log("🚫 No database locations found within 50m of geofence");
        return;
      }

      logger.log(
        `📍 Found ${nearbyLocations.length} nearby locations:`,
        nearbyLocations.map((l) => `${l.name} (${l.type})`)
      );

      const triggeredLocation = allLocations.find(
        (loc) => String(loc.id) === region.identifier
      );

      const storeForNotification = triggeredLocation ?? nearbyLocations[0];

      // Get current active shopping items for this store's type
      const currentShoppingItems = await db.query.shoppingItems.findMany({
        where: and(
          eq(schema.shoppingItems.completed, false),
          eq(schema.shoppingItems.category, storeForNotification.type)
        ),
      });

      if (currentShoppingItems.length === 0) {
        logger.log("🚫 No active shopping items");
        return;
      }

      // For now, send notification if we have any nearby stores and active items
      // TODO: Add proper category matching between shopping items and store types
      const itemCount = currentShoppingItems.length;

      logger.log(
        "📱 Sending geofence notification for store:",
        storeForNotification.name,
        "with",
        itemCount,
        "items"
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: storeForNotification.name,
          body: `may have ${itemCount} item${
            itemCount === 1 ? "" : "s"
          } in your list, Grabbit!`,
          sound: "default",
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // trigger immediately
      });
    } catch (dbError) {
      logger.error("❌ Database error in geofence task:", dbError);

      // Fallback: send basic notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "You are near a store!",
          body: "Check your shopping list.",
          sound: "default",
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    }
  }
}

// Define the geofence task handler early in app initialization
TaskManager.defineTask(GEOFENCE_TASK, handleGeofenceEvent);

export { GEOFENCE_TASK };
