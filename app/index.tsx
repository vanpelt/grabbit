/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { ShoppingListHeader } from "@/components/ShoppingListHeader";
import { ShoppingListItem } from "@/components/ShoppingListItem";
import { sampleStores } from "@/data/stores";
import { ShoppingItem } from "@/hooks/shoppingCategories";
import { useShoppingClassifier } from "@/hooks/useShoppingClassifier";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTracking } from "@/hooks/useTracking";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";

const GEOFENCE_TASK = "GEOFENCE_TASK";
const NOTIFICATION_CHANNEL_ID = "geofence-notifications";

async function setupNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission not granted",
      "You need to enable notifications for this app to work correctly."
    );
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Geofence Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

const App = () => {
  const { shoppingItems, addItem, removeItem, updateItem } = useShoppingList();
  const { isTracking, currentLocation } = useTracking(shoppingItems);

  const [newItemName, setNewItemName] = useState("");
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const editingItemId = useRef<string | null>(null);
  const lastActivityTime = useRef(0);
  const lastTranscript = useRef("");

  const [itemsWithProximity, setItemsWithProximity] = useState<(ShoppingItem & { isNearby: boolean })[]>([]);

  useEffect(() => {
    setupNotifications();
  }, []);

  // --- UI Handlers ---
  const handleAddItem = useCallback(
    async (name: string) => {
      if (!name.trim()) return;
      setNewItemName("");
      return await addItem(name);
    },
    [addItem]
  );

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

  const handleSpeechResult = async (transcript: string) => {
    if (!transcript) return;

    const now = Date.now();

    const newText = transcript.substring(lastTranscript.current.length).trim();
    if (!newText) {
      lastActivityTime.current = now;
      return;
    }

    const isPause = now - lastActivityTime.current > 1000;
    const containsAnd = /\band\b/i.test(newText);

    if (containsAnd) {
      const parts = newText.split(/\band\b/i);
      const firstPart = parts.shift()?.trim();

      if (firstPart && editingItemId.current !== null) {
        updateItem(editingItemId.current, { name: firstPart });
      } else if (firstPart) {
        const newId = await handleAddItem(firstPart);
        if (newId) {
          editingItemId.current = newId;
        }
      }

      for (const part of parts) {
        const trimmedPart = part.trim();
        if (trimmedPart) {
          const newId = await handleAddItem(trimmedPart);
          if (newId) {
            editingItemId.current = newId;
          }
        }
      }
    } else if (isPause || editingItemId.current === null) {
      const newId = await handleAddItem(newText);
      if (newId) {
        editingItemId.current = newId;
      }
    } else {
      if (editingItemId.current) {
        // Find the item to get its current name
        const currentItem = shoppingItems.find(
          (item) => item.id === editingItemId.current,
        )
        if (currentItem) {
          const updatedName = `${currentItem.name} ${newText}`.trim()
          updateItem(editingItemId.current, { name: updatedName })
        }
      }
    }

    lastActivityTime.current = now;
    lastTranscript.current = transcript;
  };

  // --- Voice Recognition Handlers ---
  const {
    isRecording,
    start: startSpeechRecognition,
    stop: stopSpeechRecognition,
  } = useSpeechRecognition({
    onStart: () => {
      startPulsing();
      editingItemId.current = null;
      lastActivityTime.current = Date.now();
      lastTranscript.current = "";
    },
    onEnd: () => {
      stopPulsing();
      editingItemId.current = null;
    },
    onError: (error) => {
      stopPulsing();
      Alert.alert("Speech Error", error.message);
    },
    onResult: handleSpeechResult,
  });

  const classifier = useShoppingClassifier();
  useEffect(() => {
    if (classifier.ready) {
      console.log("Classifier is ready, running test classifications...");
      const testItems = [
        "milk",
        "batteries",
        "hammer",
        "tylenol",
        "a new book",
      ];

      testItems.forEach((item) => {
        const { syncResult, asyncResult } = classifier.classify(item);

        // Handle cases where the model isn't ready and we get a promise
        if (asyncResult) {
          asyncResult.then((result) => {
            console.log(`[Classifier Test] (Async) "${item}" -> "${result.primaryCategory.name}"`);
          });
        } else {
          // Handle immediate results from keyword search
          console.log(`[Classifier Test] (Sync) "${item}" -> "${syncResult.primaryCategory.name}"`);
        }
      });
    }
  }, [classifier.ready, classifier.classify]);

  // --- Geolocation Effects and Handlers ---
  useEffect(() => {
    if (!currentLocation) {
      setItemsWithProximity(
        shoppingItems.map((item) => ({ ...item, isNearby: false })),
      )
      return
    }

    const allCategories = [
      ...new Map(
        shoppingItems.flatMap((i) => i.allCategories.map((c) => [c.id, c])),
      ).values(),
    ]

    const proximityByCategory = new Map<string, boolean>()

    for (const category of allCategories) {
      const storesOfType = sampleStores.filter((s) => s.type === category.id)
      let isAnyStoreNearby = false
      for (const store of storesOfType) {
        const distance = getDistance(currentLocation.coords, {
          latitude: store.lat,
          longitude: store.lng,
        })
        if (distance < 500) {
          isAnyStoreNearby = true
          break
        }
      }
      proximityByCategory.set(category.id, isAnyStoreNearby)
    }

    const newItemsWithProximity = shoppingItems.map((item) => {
      const isNearby = item.allCategories.some(
        (c) => proximityByCategory.get(c.id) === true,
      )
      return { ...item, isNearby }
    })
    setItemsWithProximity(newItemsWithProximity)
  }, [currentLocation, shoppingItems])

  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error("[GeofenceTask] error:", error);
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
      const storeName = region.identifier;

      const store = sampleStores.find((s) => s.name === storeName);
      if (!store) return;

      const action =
        eventType === Location.GeofencingEventType.Enter ? "ENTER" : "EXIT";

      if (action === "ENTER") {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "You are near a store on your list!",
            body: `You are approaching ${storeName}. Don't forget to check your shopping list.`,
            sound: "default",
            vibrate: [0, 250, 250, 250],
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null, // trigger immediately
        });
      }

      // TODO: Find a way to update the UI from the background task.
      // Direct state updates are not possible here. An event bus or
      // other mechanism would be needed.
    }
  });

  // --- Render methods ---
  const renderItem = ({ item }: { item: ShoppingItem & { isNearby: boolean } }) => {
    return (
      <ShoppingListItem
        item={item}
        onRemove={removeItem}
        onUpdate={updateItem}
      />
    );
  };

  return (
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.flex}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.flex}>
        <FlatList
          data={itemsWithProximity}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <ShoppingListHeader
              onAddItem={handleAddItem}
              isRecording={isRecording}
              onToggleRecording={
                isRecording ? stopSpeechRecognition : startSpeechRecognition
              }
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
                Location:{" "}
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

function getDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
) {
  const R = 6371e3; // metres
  const φ1 = (coord1.latitude * Math.PI) / 180; // φ, λ in radians
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}

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
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    justifyContent: "center",
    marginRight: 10,
    paddingHorizontal: 5,
    height: 50,
  },
  picker: {
    width: 150,
    color: "#000",
  },
  trackingButton: {
    backgroundColor: "#764ba2",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyListText: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 50,
  },
  locationText: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 20,
  },
});

export default App;
