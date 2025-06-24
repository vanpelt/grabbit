jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(),
  AndroidNotificationPriority: {},
}));

jest.mock("expo-task-manager", () => ({
  registerTaskAsync: jest.fn(),
  defineTask: jest.fn(),
}));

jest.mock("drizzle-orm/expo-sqlite", () => ({
  drizzle: jest.fn(),
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    closeSync: jest.fn(),
    execSync: jest.fn(),
    prepareSync: jest.fn(),
  })),
}));

jest.mock("onnxruntime-react-native", () => ({
  InferenceSession: {
    create: jest.fn().mockResolvedValue({
      run: jest.fn().mockResolvedValue({
        sentence_embedding: { data: new Float32Array(384) },
      }),
    }),
  },
  Tensor: jest.fn(),
}));

jest.mock("expo-asset", () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(),
      localUri: "mock-uri",
      uri: "mock-uri",
    })),
  },
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted" }),
  requestBackgroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted" }),
  watchPositionAsync: jest.fn().mockImplementation((_opts, cb) => {
    // Immediately call the callback with a fake location
    cb({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 5,
      },
    });
    return Promise.resolve({ remove: jest.fn() });
  }),
  hasStartedGeofencingAsync: jest.fn().mockResolvedValue(false),
  stopGeofencingAsync: jest.fn(),
  startGeofencingAsync: jest.fn(),
  GeofencingEventType: {
    Enter: 1,
    Exit: 2,
  },
  Accuracy: { High: 5 },
}));
