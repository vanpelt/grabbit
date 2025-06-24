import { DbContext } from "@/db";
import { act, render } from "@testing-library/react-native";
import React, { useEffect } from "react";
import { createTestDb, type TestDB } from "../__mocks__/testDb";
import {
  ShoppingListProvider,
  useShoppingListContext,
} from "../contexts/ShoppingListContext";
import { TrackingProvider, useTracking } from "../contexts/TrackingContext";
import * as useStoreManagerModule from "../hooks/useStoreManager";
import { CATEGORIES } from "../utils/shoppingCategories";

jest.mock("../hooks/useStoreManager");

const mockUpdateNearbyStores = jest.fn();
let db: TestDB;

beforeEach(async () => {
  jest.clearAllMocks();
  (useStoreManagerModule.useStoreManager as jest.Mock).mockReturnValue({
    updateNearbyStores: mockUpdateNearbyStores,
  });
  db = await createTestDb();
});

jest.useFakeTimers();

describe("TrackingContext store update logic", () => {
  it("should call updateNearbyStores only when categories change or location changes significantly", async () => {
    let addItem: any, updateItem: any;
    function TestComponent() {
      const shopping = useShoppingListContext();
      useTracking(); // just to ensure context is used
      useEffect(() => {
        addItem = shopping.addItem;
        updateItem = shopping.updateItem;
      }, [shopping]);
      return null;
    }
    render(
      <DbContext.Provider value={db}>
        <ShoppingListProvider>
          <TrackingProvider>
            <TestComponent />
          </TrackingProvider>
        </ShoppingListProvider>
      </DbContext.Provider>
    );

    // 1. Initial item added with a category -> update
    await act(async () => {
      await addItem("Milk"); // grocery
      jest.advanceTimersByTime(2100);
    });
    expect(mockUpdateNearbyStores).toHaveBeenCalledTimes(1);

    // 2. New item added with same category -> no update
    await act(async () => {
      await addItem("Eggs"); // grocery
    });
    expect(mockUpdateNearbyStores).toHaveBeenCalledTimes(1);

    // 3. New item added with new category -> update
    await act(async () => {
      await addItem("Aspirin"); // pharmacy
    });
    expect(mockUpdateNearbyStores).toHaveBeenCalledTimes(2);

    // 4. Existing item category updated to the same category as 3 -> no update
    // Find the id of "Aspirin" (pharmacy)
    // We'll fetch the items from the DB/context to get the real id
    // For now, let's assume the third item is "Aspirin" and has id "3"
    await act(async () => {
      await updateItem("3", {
        primaryCategory: CATEGORIES.find((c) => c.id === "pharmacy")!,
      });
    });
    expect(mockUpdateNearbyStores).toHaveBeenCalledTimes(2);

    // 5. Existing item category updated to new category -> update
    await act(async () => {
      await updateItem("3", {
        primaryCategory: CATEGORIES.find((c) => c.id === "hardware")!,
      });
    });
    expect(mockUpdateNearbyStores).toHaveBeenCalledTimes(3);

    // 6. Item name changes again -> update
    await act(async () => {
      await updateItem("3", { name: "Aspirin 500mg" });
    });
    expect(mockUpdateNearbyStores).toHaveBeenCalledTimes(4);
  });
});
