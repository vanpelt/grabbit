// useShoppingClassifier.ts
import { useMemo } from 'react';
import { categorizeItem } from './shoppingCategories';

// ---- 1. React hook ------------------------------------------------------
export function useShoppingClassifier() {
  /** Label a single item using the keyword-based system. */
  const classify = (text: string) => {
    // The new system is synchronous and returns a structured object.
    // We can adapt its output to match the simple string output of the previous classifier.
    const { primaryCategory } = categorizeItem(text);
    return primaryCategory.id;
  };

  // The new classifier is always "ready" and has no error state since it's just a local function.
  // We maintain this API for compatibility with components that might use these properties.
  return useMemo(
    () => ({
      classify,
      isReady: true,
      error: undefined,
    }),
    [],
  );
}
