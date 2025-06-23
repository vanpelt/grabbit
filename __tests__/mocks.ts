jest.mock("@/db/schema", () => ({
  shoppingItems: {
    completed: "completed",
  },
}));

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
