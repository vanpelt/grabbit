import { useDb } from "@/db";
import { shoppingItems } from "@/db/schema";
import { useShoppingClassifier } from "@/hooks/useShoppingClassifier";
import logger from "@/utils/logger";
import {
  CATEGORIES,
  ItemCategory,
  ShoppingItem,
} from "@/utils/shoppingCategories";
import { eq } from "drizzle-orm";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ShoppingListContextType {
  shoppingItems: ShoppingItem[];
  addItem: (name: string) => Promise<string | null>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (
    id: string,
    updates: Partial<Omit<ShoppingItem, "id">>
  ) => Promise<void>;
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(
  undefined
);

export const useShoppingListContext = () => {
  const ctx = useContext(ShoppingListContext);
  if (!ctx)
    throw new Error(
      "useShoppingListContext must be used within ShoppingListProvider"
    );
  return ctx;
};

const capitalize = (s: string) => {
  if (typeof s !== "string" || s.length === 0) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function getCategoryById(id: string | null | undefined): ItemCategory {
  return (
    CATEGORIES.find((c) => c.id === id) ||
    CATEGORIES.find((c) => c.id === "unknown")!
  );
}

// Helper to classify and update item in DB/state
async function classifyAndUpdateItemImpl(
  params: {
    id?: string;
    name?: string;
    category?: string;
    completed?: boolean;
  },
  db: any,
  classifierRef: any,
  setItems: any,
  mapDbItemToShoppingItem: any
): Promise<string | null> {
  const { id, name, category, completed } = params;
  let primaryCategoryId = category;
  let syncResult, asyncResult;
  if (name) {
    ({ syncResult, asyncResult } = classifierRef.current.classify(name));
    logger.log(
      "Basic category classification",
      syncResult.primaryCategory.name
    );
    primaryCategoryId = syncResult.primaryCategory.id;
  }
  // Insert or update in DB
  let dbResult: any = undefined;
  if (!id) {
    [dbResult] = await db
      .insert(shoppingItems)
      .values({
        name: name ? capitalize(name) : "",
        category: primaryCategoryId ?? "unknown",
      })
      .returning();
  } else {
    await db
      .update(shoppingItems)
      .set({
        name: name !== undefined ? capitalize(name) : undefined,
        category: primaryCategoryId,
        completed,
      })
      .where(eq(shoppingItems.id, Number(id)));
  }
  // Update state
  const freshItems = await db.query.shoppingItems.findMany();
  setItems(freshItems.map(mapDbItemToShoppingItem));
  // Handle async classification
  if (asyncResult && (!id ? dbResult : id)) {
    asyncResult.then(async (result: any) => {
      logger.log("AI category classification", result.primaryCategory.name);
      if (result.primaryCategory.id === "unknown") {
        logger.warn("Not updating item with unknown category");
        return;
      }
      const itemId = !id ? dbResult.id : id;
      await db
        .update(shoppingItems)
        .set({
          category: result.primaryCategory.id,
        })
        .where(eq(shoppingItems.id, Number(itemId)));
      const freshItems2 = await db.query.shoppingItems.findMany();
      setItems(freshItems2.map(mapDbItemToShoppingItem));
    });
  }
  if (!id) {
    return dbResult ? String(dbResult.id) : null;
  }
  return null;
}

export const ShoppingListProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const db = useDb();
  const classifier = useShoppingClassifier();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const classifierRef = useRef(classifier);
  useEffect(() => {
    classifierRef.current = classifier;
  }, [classifier]);

  const mapDbItemToShoppingItem = (
    item: typeof shoppingItems.$inferSelect
  ): ShoppingItem => {
    return {
      ...item,
      id: String(item.id),
      primaryCategory: getCategoryById(item.category),
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

  const classifyAndUpdateItem = useCallback(
    (params: {
      id?: string;
      name?: string;
      category?: string;
      completed?: boolean;
    }) =>
      classifyAndUpdateItemImpl(
        params,
        db,
        classifierRef,
        setItems,
        mapDbItemToShoppingItem
      ),
    [db, classifierRef, setItems, mapDbItemToShoppingItem]
  );

  const addItem = useCallback(
    async (name: string): Promise<string | null> => {
      if (!classifierRef.current.ready) {
        logger.warn(
          "Classifier not ready, only basic classification will be used"
        );
      }
      return classifyAndUpdateItem({ name });
    },
    [classifyAndUpdateItem]
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
      await classifyAndUpdateItem({
        id,
        name: updates.name,
        category: updates.primaryCategory
          ? updates.primaryCategory.id
          : undefined,
        completed: updates.completed,
      });
    },
    [classifyAndUpdateItem]
  );

  return (
    <ShoppingListContext.Provider
      value={{ shoppingItems: items, addItem, removeItem, updateItem }}
    >
      {children}
    </ShoppingListContext.Provider>
  );
};
