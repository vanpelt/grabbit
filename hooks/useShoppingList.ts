import { useShoppingClassifier } from '@/hooks/useShoppingClassifier';
import { useCallback, useRef, useState } from 'react';
import { Store } from '../data/stores';

// Type definitions - can be moved to a separate types file later
export interface NearbyStore {
  store: Store;
  distance: number;
}

export interface ShoppingItem {
  id: number;
  name: string;
  storeTypes: string[];
  isNearby: boolean;
  nearbyStores: NearbyStore[];
}

const capitalize = (s: string) => {
  if (typeof s !== 'string' || s.length === 0) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const useShoppingList = () => {
  const classifier = useShoppingClassifier();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const idCounter = useRef(0);

  const addItem = useCallback(async (name: string): Promise<number> => {
    if (!classifier.isReady) {
      // Consider how to handle this case, maybe return an error or a specific status
      console.warn('Classifier not ready');
      return -1;
    }
    const category = await classifier.classify(name);
    const newId = Date.now() + idCounter.current++;
    const newItem: ShoppingItem = {
      id: newId,
      name: capitalize(name),
      storeTypes: [category],
      isNearby: false,
      nearbyStores: [],
    };
    setItems(prevItems => [...prevItems, newItem]);
    return newId;
  }, [classifier]);

  const removeItem = useCallback((id: number) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);

  const updateItemName = useCallback((id: number, name: string) => {
    setItems(prevItems =>
      prevItems.map(item => (item.id === id ? { ...item, name } : item))
    );
  }, []);

  const updateItemsProximity = useCallback((proximityByStoreType: Map<string, boolean>) => {
    setItems(prevItems => {
        let hasChanged = false;
        const newItems = prevItems.map(item => {
            const isNowNearby = item.storeTypes.some(type => proximityByStoreType.get(type) === true);

            if (item.isNearby !== isNowNearby) {
                hasChanged = true;
                return { ...item, isNearby: isNowNearby };
            }
            return item;
        });
        return hasChanged ? newItems : prevItems;
    });
  }, []);


  return {
    shoppingItems: items,
    addItem,
    removeItem,
    updateItemName,
    updateItemsProximity,
  };
}; 