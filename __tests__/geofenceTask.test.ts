import { handleGeofenceEvent } from "@/tasks/geofenceTask";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

const mockDb = {
  query: {
    locations: {
      findMany: jest.fn(),
    },
    shoppingItems: {
      findMany: jest.fn(),
    },
  },
};

jest.mock("@/db/schema", () => ({
  shoppingItems: {
    completed: "completed",
  },
}));

describe("handleGeofenceEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (drizzle as jest.Mock).mockReturnValue(mockDb);
  });

  it("should send a notification when entering a geofence with matching items", async () => {
    // Arrange
    mockDb.query.locations.findMany.mockResolvedValue([
      { id: 1, name: "Target", type: "grocery", lat: 34.0522, lng: -118.2437 },
    ]);
    mockDb.query.shoppingItems.findMany.mockResolvedValue([
      {
        id: 1,
        name: "Milk",
        completed: false,
        primaryCategory: { id: "grocery" },
      },
    ]);

    const mockData = {
      eventType: Location.GeofencingEventType.Enter,
      region: {
        identifier: "Target",
        latitude: 34.0522,
        longitude: -118.2437,
      },
    };

    // Act
    await handleGeofenceEvent({ data: mockData, error: null });

    // Assert
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "You are near a store on your list!",
        body: "You are near Target. You have 1 item to buy.",
        sound: "default",
        vibrate: [0, 250, 250, 250],
        priority: (Notifications as any).AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  });

  it("should not send a notification if there are no active shopping items", async () => {
    // Arrange
    mockDb.query.locations.findMany.mockResolvedValue([
      { id: 1, name: "Target", type: "grocery", lat: 34.0522, lng: -118.2437 },
    ]);
    mockDb.query.shoppingItems.findMany.mockResolvedValue([]);

    const mockData = {
      eventType: Location.GeofencingEventType.Enter,
      region: {
        identifier: "Target",
        latitude: 34.0522,
        longitude: -118.2437,
      },
    };

    // Act
    await handleGeofenceEvent({ data: mockData, error: null });

    // Assert
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
