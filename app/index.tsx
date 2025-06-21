/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useShoppingClassifier } from '@/hooks/useShoppingClassifier';
import { useAudioPlayer } from 'expo-audio';
import * as Location from 'expo-location';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from 'expo-speech-recognition';
import * as TaskManager from 'expo-task-manager';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const GEOFENCE_TASK = 'GEOFENCE_TASK';

// Type definitions
interface Store {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

interface NearbyStore {
  store: Store;
  distance: number;
}

interface ShoppingItem {
  id: number;
  name: string;
  storeTypes: string[];
  isNearby: boolean;
  nearbyStores: NearbyStore[];
}

// Store type mappings to common store names
const storeMapping: { [key: string]: string[] } = {
  grocery: ['Safeway', 'Kroger', 'Walmart', 'Target', 'Whole Foods', 'Trader Joes'],
  pharmacy: ['CVS', 'Walgreens', 'Rite Aid', 'Pharmacy'],
  hardware: ['Home Depot', 'Lowes', 'Hardware Store', 'ACE Hardware'],
  electronics: ['Best Buy', 'Apple Store'],
  clothing: ['Macys', 'Target', 'Nordstrom', 'Gap', 'H&M'],
  bookstore: ['Barnes & Noble', 'Bookstore', 'Library'],
  department: ['Target', 'Walmart', 'Macys', 'Costco', 'Sams Club'],
};

const sampleStores: Store[] = [
    { name: 'Safeway Downtown', lat: 37.7749, lng: -122.4194, type: 'grocery' },
    { name: 'CVS Pharmacy', lat: 37.7849, lng: -122.4094, type: 'pharmacy' },
    { name: 'Target Mission', lat: 37.7649, lng: -122.4294, type: 'department' },
    { name: 'Home Depot SOMA', lat: 37.7549, lng: -122.3994, type: 'hardware' },
    { name: 'Best Buy Union Square', lat: 37.7849, lng: -122.4094, type: 'electronics' }
];

// --- Prop Types for Header ---
interface ListHeaderProps {
  onAddItem: (name: string) => void;
  onToggleTracking: () => void;
  isTracking: boolean;
  currentLocation: Location.LocationObject | null;
  isRecording: boolean;
  onToggleRecording: () => void;
  newItemName: string;
  setNewItemName: (name: string) => void;
  pulseAnimation: Animated.Value;
}

// --- Header Component ---
// This component is memoized and manages its own state for the inputs,
// preventing the main app from re-rendering on every keystroke.
const ListHeader = React.memo(
  ({
    onAddItem,
    onToggleTracking,
    isTracking,
    currentLocation,
    isRecording,
    onToggleRecording,
    newItemName,
    setNewItemName,
    pulseAnimation,
  }: ListHeaderProps) => {
    const handlePressAddItem = () => {
      if (!newItemName.trim()) return;
      onAddItem(newItemName);
      setNewItemName('');
    };

    const isInputEmpty = newItemName.trim().length === 0;

    return (
      <>
        <Text style={styles.h1}>🎯 Grabbit</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add shopping item (e.g., milk, batteries)"
            placeholderTextColor="#888"
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handlePressAddItem} // Allows adding via keyboard return key
          />
          <TouchableOpacity
            style={styles.addItemButton}
            onPress={isInputEmpty ? onToggleRecording : handlePressAddItem}>
            <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
              <Text style={styles.addItemButtonText}>{isInputEmpty ? (isRecording ? '🛑' : '🎤') : '+'}</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.trackingButton}
          onPress={onToggleTracking}>
          <Text style={styles.buttonText}>
            {isTracking ? 'STOP TRACKING' : 'START TRACKING'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.h2}>Shopping List</Text>
      </>
    );
  }
);

const audioSource = require('../assets/start.mp3');

const App = () => {
  const classifier = useShoppingClassifier();
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const shoppingItemsRef = useRef(shoppingItems);
  useEffect(() => {
    shoppingItemsRef.current = shoppingItems;
  }, [shoppingItems]);

  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const player = useAudioPlayer(audioSource);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const silenceTimeout = useRef<number | null>(null);
  const hasProcessedResult = useRef(false);

  const updateGeofences = useCallback(async () => {
    const hasGeofences = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
    if (hasGeofences) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
      console.log('[updateGeofences] Stopped existing geofencing task.');
    }

    const allStores = sampleStores.filter(s =>
      shoppingItemsRef.current.some(item => item.storeTypes.includes(s.type))
    );

    if (allStores.length === 0) {
      console.log('[updateGeofences] No stores to monitor.');
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
    console.log('[updateGeofences] Started geofencing for', geofenceRegions.length, 'regions.');
  }, []);

  // --- UI Handlers ---
  const handleAddItem = useCallback(async (name: string) => {
    if (!classifier.isReady) {
      Alert.alert('Classifier Not Ready', 'The item classifier is still loading. Please wait a moment and try again.');
      return;
    }
    
    setNewItemName(''); // Clear input after adding

    const category = await classifier.classify(name);
    const newItem: ShoppingItem = {
      id: Date.now(),
      name: name,
      storeTypes: [category], // Automatically categorized
      isNearby: false,
      nearbyStores: [],
    };

    setShoppingItems(prevItems => {
      const newItems = [...prevItems, newItem];
      shoppingItemsRef.current = newItems;
      updateGeofences();
      return newItems;
    });
  }, [classifier, updateGeofences]);

  // --- Animation Handlers ---
  const startPulsing = () => {
    pulseAnimation.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulsing = () => {
    pulseAnimation.stopAnimation(() => {
      Animated.spring(pulseAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });
  };

  // --- Voice Recognition Handlers ---
  useSpeechRecognitionEvent('start', () => {
    console.log('onSpeechStart');
    setIsRecording(true);
    startPulsing();
    hasProcessedResult.current = false;
    silenceTimeout.current = setTimeout(() => {
      console.log('Silence timeout, stopping recognition.');
      stopSpeechRecognition();
    }, 5000); // 5 seconds of silence
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('onSpeechEnd');
    setIsRecording(false);
    stopPulsing();
    if (silenceTimeout.current) {
      clearTimeout(silenceTimeout.current);
      silenceTimeout.current = null;
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('onSpeechError: ', event);
    stopSpeechRecognition();
    Alert.alert('Speech Error', event.message);
  });

  useSpeechRecognitionEvent('result', (event) => {
    console.log('onSpeechResults: ', event);
    if (event.results && event.results.length > 0 && !hasProcessedResult.current) {
      const transcript = event.results[0]?.transcript;
      if(transcript) {
        hasProcessedResult.current = true;
        handleAddItem(transcript);
      }
    }
    if(event.isFinal) {
      stopSpeechRecognition();
    }
  });

  const startSpeechRecognition = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Permissions not granted', 'Please allow microphone access.');
      return;
    }
    try {
      await ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true });
      if (player) {
        console.log('Playing Sound');
        await player.play();
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error starting recognition', e.message);
    }
  };

  const stopSpeechRecognition = async () => {
    if (silenceTimeout.current) {
      clearTimeout(silenceTimeout.current);
      silenceTimeout.current = null;
    }
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (e: any) {
      // It's possible the stop command fails if recognition is already stopped.
      // We can ignore this error.
       if (e.code !== 'recognizer-not-running') {
         console.error(e);
       }
    }
    setIsRecording(false);
    stopPulsing();
  };

  useEffect(() => {
    if (classifier.isReady) {
      console.log('Classifier is ready, running test classifications...');
      const testItems = ['milk', 'batteries', 'hammer', 'tylenol', 'a new book'];
      testItems.forEach(async (item) => {
        const category = await classifier.classify(item);
        console.log(`[Classifier Test] "${item}" -> "${category}"`);
      });
    }
  }, [classifier.isReady, classifier.classify]);

  // --- Geolocation Effects and Handlers ---
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
        let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            Alert.alert('Permission to access location was denied');
            return;
        }

        let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            console.log('Permission to access background location was denied. Proceeding with foreground tracking only.');
            // We can still proceed with foreground tracking, so we don't show a blocking alert.
        }

        console.log('[ready] BG Geolocation permissions granted.');
        setIsTracking(true);

        locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 10000,
                distanceInterval: 10,
            },
            (location) => {
                console.log('[onLocation] -', location);
                setCurrentLocation(location);
            }
        );
        updateGeofences(); // Start geofencing with current items.
    };
    
    if (isTracking) {
      startLocationTracking();
    }

    return () => {
      if (locationSubscription) {
          locationSubscription.remove();
      }
      Location.hasStartedGeofencingAsync(GEOFENCE_TASK).then(hasGeofences => {
        if (hasGeofences) {
          Location.stopGeofencingAsync(GEOFENCE_TASK);
        }
      });
    };
  }, [isTracking, updateGeofences]);
  
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
    if (error) {
        console.error('[GeofenceTask] error:', error);
        return;
    }
    if (data) {
        const { eventType, region } = data as { eventType: Location.GeofencingEventType, region: { identifier: string, radius: number, latitude: number, longitude: number, state: Location.GeofencingRegionState } };
        const storeName = region.identifier;

        const store = sampleStores.find(s => s.name === storeName);
        if (!store) return;
        
        const action = eventType === Location.GeofencingEventType.Enter ? 'ENTER' : 'EXIT';
        Alert.alert('Geofence Alert', `You are ${action === 'ENTER' ? 'entering' : 'exiting'} the area for ${storeName}`);

        const currentItems = shoppingItemsRef.current;
        const updatedItems = currentItems.map(item => {
            if (item.storeTypes.includes(store.type)) {
                const isEntering = action === 'ENTER';
                return { ...item, isNearby: isEntering };
            }
            return item;
        });
        setShoppingItems(updatedItems);
    }
  });

  const startTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setCurrentLocation(null);
  }, []);

  const handleRemoveItem = useCallback((id: number) => {
    let itemToRemove: ShoppingItem | undefined;
    setShoppingItems(prevItems => {
      const newItems = prevItems.filter(item => {
        if (item.id === id) {
          itemToRemove = item;
          return false;
        }
        return true;
      });
      shoppingItemsRef.current = newItems;
      updateGeofences();
      return newItems;
    });
  }, [updateGeofences]);

  // --- Render methods ---
  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const storeNames = item.storeTypes.map(type => storeMapping[type]).flat().join(', ');
    const nearbyText = item.isNearby
      ? 'A relevant store is nearby!'
      : 'No nearby stores detected';

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <TouchableOpacity
            onPress={() => handleRemoveItem(item.id)}
            style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>DELETE</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.itemDetails}>Available at: {storeNames}</Text>
        <Text style={styles.itemDetails}>{nearbyText}</Text>
        <View style={styles.tagContainer}>
          {item.storeTypes.map(type => (
            <View key={type} style={styles.tag}>
              <Text style={styles.tagText}>{type}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.flex}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.flex}>
        <FlatList
          data={shoppingItems}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <ListHeader
              onAddItem={handleAddItem}
              onToggleTracking={isTracking ? stopTracking : startTracking}
              isTracking={isTracking}
              currentLocation={currentLocation}
              isRecording={isRecording}
              onToggleRecording={isRecording ? stopSpeechRecognition : startSpeechRecognition}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              pulseAnimation={pulseAnimation}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No items yet. Add one!</Text>
          }
          ListFooterComponent={
            currentLocation ? (
              <Text style={styles.locationText}>
                Location:{' '}
                {`${currentLocation.coords.latitude.toFixed(
                  4
                )}, ${currentLocation.coords.longitude.toFixed(4)}`}
              </Text>
            ) : (
              <Text style={styles.locationText}>Location: Not available</Text>
            )
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 60, // Ensure space for footer
  },
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 15 : 10,
    color: '#000',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    marginRight: 10,
    paddingHorizontal: 5,
    height: 50,
  },
  picker: {
    width: 150,
    color: '#000',
  },
  addItemButton: {
    backgroundColor: '#764ba2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
  },
  trackingButton: {
    backgroundColor: '#764ba2',
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    marginBottom: 10,
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  itemDetails: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 5,
  },
  tagText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyListText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 50,
  },
  locationText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 20,
  },
});

export default App;
