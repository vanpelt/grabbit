import { Link } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTracking } from "../contexts/TrackingContext";

const SettingsScreen = () => {
  const { isTracking, toggleTracking, geofencedStores, isLoading } =
    useTracking();

  return (
    <View style={styles.container}>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Enable Location Tracking</Text>
        <Switch value={isTracking} onValueChange={toggleTracking} />
      </View>
      <View style={styles.geofenceContainer}>
        <Text style={styles.geofenceTitle}>Active Geofences</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#3498db" />
        ) : geofencedStores.length > 0 ? (
          <FlatList
            data={geofencedStores}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.geofenceRow}>
                <Text style={styles.geofenceText}>{item.name}</Text>
                <Text style={styles.geofenceDistance}>
                  {item.distance.toFixed(2)} km
                </Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.noGeofencesText}>
            No active geofences. Add items to your shopping list to enable
            geofencing.
          </Text>
        )}
      </View>
      {__DEV__ && (
        <Link href="/developer" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Developer Tools</Text>
          </TouchableOpacity>
        </Link>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 16,
  },
  button: {
    backgroundColor: "#3498db",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  geofenceContainer: {
    marginTop: 20,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
  },
  geofenceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  geofenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  geofenceText: {
    fontSize: 16,
  },
  geofenceDistance: {
    fontSize: 16,
    color: "#888",
  },
  noGeofencesText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    paddingVertical: 10,
  },
});

export default SettingsScreen;
