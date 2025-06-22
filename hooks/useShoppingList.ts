import { useDb } from "@/db";
import { shoppingItems } from "@/db/schema";
import { useShoppingClassifier } from "@/hooks/useShoppingClassifier";
import { eq } from "drizzle-orm";
import { useCallback, useEffect, useRef, useState } from "react";
import { Store } from "../data/stores";
import { ShoppingItem as ShoppingItemWithCategories } from "./shoppingCategories";

export type ShoppingItem = ShoppingItemWithCategories;

// Type definitions - can be moved to a separate types file later
export interface NearbyStore {
  store: Store;
  distance: number;
}

const capitalize = (s: string) => {
  if (typeof s !== "string" || s.length === 0) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const useShoppingList = () => {
  const db = useDb();
  const classifier = useShoppingClassifier();
  const [items, setItems] = useState<ShoppingItem[]>([]);

  const mapDbItemToShoppingItem = (
    item: typeof shoppingItems.$inferSelect
  ): ShoppingItem => {
    return {
      ...item,
      id: String(item.id),
      primaryCategory: JSON.parse(item.category || "null"),
      createdAt: new Date(item.createdAt),
    };
  };

  useEffect(() => {
    if (!db) return;
    async function fetchItems() {
      const result = await db.query.shoppingItems.findMany();
      setItems(result.map(mapDbItemToShoppingItem));
    }
    fetchItems();
  }, [db]);

  // Store the classifier in a ref to prevent stale closures in callbacks.
  const classifierRef = useRef(classifier);
  useEffect(() => {
    classifierRef.current = classifier;
  }, [classifier]);

  const addItem = useCallback(
    async (name: string): Promise<string | null> => {
      // Use the ref to get the latest classifier state.
      if (!classifierRef.current.ready) {
        console.warn("Classifier not ready");
        return null;
      }

      const { syncResult, asyncResult } = classifierRef.current.classify(name);
      console.log("syncResult", syncResult.primaryCategory.name);

      const [newItemFromDb] = await db
        .insert(shoppingItems)
        .values({
          name: capitalize(name),
          category: JSON.stringify(syncResult.primaryCategory),
        })
        .returning();

      const newItem = mapDbItemToShoppingItem(newItemFromDb);
      setItems((prevItems) => [...prevItems, newItem]);

      // If there's an async result, update the item when it resolves.
      if (asyncResult) {
        asyncResult.then((result) => {
          console.log("asyncResult", result.primaryCategory.name);
          updateItem(newItem.id, {
            primaryCategory: result.primaryCategory,
          });
        });
      }

      return newItem.id;
    },
    [db]
  );

  const removeItem = useCallback(
    async (id: string) => {
      await db.delete(shoppingItems).where(eq(shoppingItems.id, Number(id)));
      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    },
    [db]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<Omit<ShoppingItem, "id">>) => {
      const numericId = Number(id);
      // If the update includes a name change and the classifier is ready,
      // we need to re-classify the item.
      if (updates.name && classifierRef.current.ready) {
        const newName = updates.name;

        const { syncResult, asyncResult } =
          classifierRef.current.classify(newName);

        // Update the item with the new name and the synchronous classification result.
        await db
          .update(shoppingItems)
          .set({
            name: updates.name ? capitalize(updates.name) : undefined,
            category: JSON.stringify(syncResult.primaryCategory),
            completed: updates.completed,
          })
          .where(eq(shoppingItems.id, numericId));

        // If there's an async result, schedule a follow-up update for even better classification.
        if (asyncResult) {
          asyncResult.then(async (result) => {
            await db
              .update(shoppingItems)
              .set({
                category: JSON.stringify(result.primaryCategory),
              })
              .where(eq(shoppingItems.id, numericId));
            const freshItems = await db.query.shoppingItems.findMany();
            setItems(freshItems.map(mapDbItemToShoppingItem));
          });
        }
      } else {
        // If there's no name change or classifier isn't ready, just apply the updates.
        await db
          .update(shoppingItems)
          .set({
            name: updates.name ? capitalize(updates.name) : undefined,
            category: updates.primaryCategory
              ? JSON.stringify(updates.primaryCategory)
              : undefined,
            completed: updates.completed,
          })
          .where(eq(shoppingItems.id, numericId));
      }

      const freshItems = await db.query.shoppingItems.findMany();
      setItems(freshItems.map(mapDbItemToShoppingItem));
    },
    [db]
  );

  return {
    shoppingItems: items,
    addItem,
    removeItem,
    updateItem,
  };
};
