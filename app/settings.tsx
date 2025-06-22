import * as Notifications from 'expo-notifications';
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTracking } from '../hooks/useTracking';

const SettingsScreen = () => {
  const { isTracking, toggleTracking } = useTracking();

  const handleTestNotification = () => {
    const testStoreName = 'Safeway Downtown'; // Using a sample store for the test
    console.log(`[Test] Simulating geofence entry for ${testStoreName}`);
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'You are near a store on your list!',
        body: `You are approaching ${testStoreName}. Don't forget to check your shopping list.`,
        sound: 'default',
        vibrate: [0, 250, 250, 250],
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // trigger immediately
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Enable Location Tracking</Text>
        <Switch
          value={isTracking}
          onValueChange={toggleTracking}
        />
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={handleTestNotification}>
        <Text style={styles.buttonText}>
          Test Notification
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SettingsScreen; 