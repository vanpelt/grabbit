import { ShoppingListProvider } from "@/contexts/ShoppingListContext";
import { DbContext } from "@/db";
import * as schema from "@/db/schema";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, router } from "expo-router";
import { SQLiteDatabase, SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { useSQLiteDevTools } from "expo-sqlite-devtools";
import { Suspense, useEffect, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { TrackingProvider } from "../contexts/TrackingContext";
import migrations from "../drizzle/migrations";

// Import the geofence task to ensure it's defined early
import "../tasks/geofenceTask";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

async function onInit(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode = WAL;");
  // The `drizzle(db)` without schema is fine for migrations
  await migrate(drizzle(db), migrations);
}

export default function RootLayout() {
  return (
    <Suspense
      fallback={
        <View>
          <Text>Loading...</Text>
        </View>
      }
    >
      <SQLiteProvider databaseName="grabbit.db" onInit={onInit} useSuspense>
        <MainLayout />
      </SQLiteProvider>
    </Suspense>
  );
}

function MainLayout() {
  const expoDb = useSQLiteContext();
  useSQLiteDevTools(expoDb);
  // We use useMemo to ensure the drizzle instance is stable
  const db = useMemo(() => drizzle(expoDb, { schema }), [expoDb]);

  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
    ...Ionicons.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <DbContext.Provider value={db}>
      <ShoppingListProvider>
        <TrackingProvider>
          <RootLayoutNav />
        </TrackingProvider>
      </ShoppingListProvider>
    </DbContext.Provider>
  );
}

function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Grabbit",
          headerTransparent: true,
          headerTintColor: "#fff",
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push("/settings")}>
              <Ionicons
                name="settings-outline"
                size={24}
                color="white"
                style={{ marginRight: 15 }}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          presentation: "modal",
          title: "Settings",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 15 }}
            >
              <Text style={{ color: "#007AFF", fontSize: 17 }}>Done</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
