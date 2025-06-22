import { useShoppingClassifier } from '@/hooks/useShoppingClassifier';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Store } from '../data/stores';
import { ShoppingItem } from './shoppingCategories';

// Type definitions - can be moved to a separate types file later
export interface NearbyStore {
  store: Store;
  distance: number;
}

const capitalize = (s: string) => {
  if (typeof s !== 'string' || s.length === 0) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const useShoppingList = () => {
  const classifier = useShoppingClassifier();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const idCounter = useRef(0);

  // Store the classifier in a ref to prevent stale closures in callbacks.
  const classifierRef = useRef(classifier);
  useEffect(() => {
    classifierRef.current = classifier;
  }, [classifier]);

  const addItem = useCallback(
    async (name: string): Promise<string | null> => {
      // Use the ref to get the latest classifier state.
      if (!classifierRef.current.ready) {
        console.warn('Classifier not ready');
        return null;
      }

      const { syncResult, asyncResult } = classifierRef.current.classify(name);
      console.log("syncResult", syncResult.primaryCategory.name);
      const newId = String(Date.now() + idCounter.current++);

      // Add the item immediately with the synchronous result.
      const newItem: ShoppingItem = {
        id: newId,
        name: capitalize(name),
        primaryCategory: syncResult.primaryCategory,
        allCategories: syncResult.allCategories,
        completed: false,
        createdAt: new Date(),
      };
      setItems(prevItems => [...prevItems, newItem]);

      // If there's an async result, update the item when it resolves.
      if (asyncResult) {
        asyncResult.then((result) => {
          console.log("asyncResult", result.primaryCategory.name);
          setItems((prevItems) =>
            prevItems.map((item) => {
              if (item.id !== newId) return item
              // Manually construct the new item to prevent accidental merging
              return {
                id: item.id,
                name: item.name,
                completed: item.completed,
                createdAt: item.createdAt,
                primaryCategory: result.primaryCategory,
                allCategories: result.allCategories,
              }
            }),
          );
        });
      }

      return newId;
    },
    [], // No dependencies, so this callback is stable.
  );

  const removeItem = useCallback((id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }, [])

  const updateItem = useCallback(
    (id: string, updates: Partial<ShoppingItem>) => {
      // If the update includes a name change and the classifier is ready,
      // we need to re-classify the item.
      if (updates.name && classifierRef.current.ready) {
        const newName = updates.name

        const { syncResult, asyncResult } =
          classifierRef.current.classify(newName)

        // Update the item with the new name and the synchronous classification result.
        setItems((prevItems) =>
          prevItems.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                ...updates,
                name: capitalize(newName),
                primaryCategory: syncResult.primaryCategory,
                allCategories: syncResult.allCategories,
              }
            }
            return item
          }),
        )

        // If there's an async result, schedule a follow-up update for even better classification.
        if (asyncResult) {
          asyncResult.then((result) => {
            setItems((prevItems) =>
              prevItems.map((item) => {
                if (item.id !== id) return item
                // Manually construct the new item to prevent accidental merging
                return {
                  id: item.id,
                  name: item.name,
                  completed: item.completed,
                  createdAt: item.createdAt,
                  primaryCategory: result.primaryCategory,
                  allCategories: result.allCategories,
                }
              }),
            )
          })
        }
      } else {
        // If there's no name change or classifier isn't ready, just apply the updates.
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        )
      }
    },
    [],
  )

  return {
    shoppingItems: items,
    addItem,
    removeItem,
    updateItem,
  };
}; 