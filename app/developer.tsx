import { useDb } from "@/db";
import { locations } from "@/db/schema";
import { handleGeofenceEvent } from "@/tasks/geofenceTask";
import logger from "@/utils/logger";
import * as Location from "expo-location";
import { Stack } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DeveloperScreen() {
  const db = useDb();
  const allLocations = db.select().from(locations).all();

  const onSimulateGeofence = (location: typeof locations.$inferSelect) => {
    logger.log("Simulating geofence for", location.name);
    const mockData = {
      eventType: Location.GeofencingEventType.Enter,
      region: {
        identifier: location.id,
        radius: 100,
        latitude: location.lat,
        longitude: location.lng,
        state: Location.GeofencingRegionState.Inside,
      },
    };

    handleGeofenceEvent({ data: mockData, error: null });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Developer Tools" }} />
      <ScrollView>
        <Text style={styles.title}>Geofence Testing</Text>
        {allLocations.map((location) => (
          <View key={location.id} style={styles.locationContainer}>
            <View>
              <Text style={styles.locationName}>{location.name}</Text>
              <Text style={styles.locationType}>{location.type}</Text>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => onSimulateGeofence(location)}
            >
              <Text style={styles.buttonText}>Simulate</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  locationName: {
    fontSize: 16,
    fontWeight: "500",
  },
  locationType: {
    fontSize: 14,
    color: "#666",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
