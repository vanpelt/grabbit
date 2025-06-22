import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { sampleStores } from '../data/stores';
import { ShoppingItem } from './useShoppingList';

const GEOFENCE_TASK = 'GEOFENCE_TASK';

export const useTracking = (shoppingItems: ShoppingItem[]) => {
  const [isTracking, setIsTracking] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const shoppingItemsRef = useRef(shoppingItems);

  useEffect(() => {
    shoppingItemsRef.current = shoppingItems;
  }, [shoppingItems]);

  const updateGeofences = useCallback(async () => {
    const hasGeofences = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
    if (hasGeofences) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }

    const allStores = sampleStores.filter(s =>
      shoppingItemsRef.current.some(item => item.storeTypes.includes(s.type))
    );

    if (allStores.length === 0) {
      return;
    }

    const geofenceRegions = allStores.map(store => ({
      identifier: store.name,
      latitude: store.lat,
      longitude: store.lng,
      radius: 500,
      notifyOnEnter: true,
      notifyOnExit: true,
    }));

    await Location.startGeofencingAsync(GEOFENCE_TASK, geofenceRegions);
  }, []);

  const startTracking = useCallback(async () => {
    let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
    }

    let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
        console.log('Permission to access background location was denied. Proceeding with foreground tracking only.');
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
        }
      );
      updateGeofences();
    };

    if (isTracking) {
      startLocationServices();
    }

    return () => {
      locationSubscription?.remove();
      Location.hasStartedGeofencingAsync(GEOFENCE_TASK).then(hasGeofences => {
        if (hasGeofences) {
          Location.stopGeofencingAsync(GEOFENCE_TASK);
        }
      });
    };
  }, [isTracking, startTracking, updateGeofences]);

  useEffect(() => {
    updateGeofences();
  }, [shoppingItems, updateGeofences]);
  
  return { isTracking, currentLocation, startTracking };
}; 