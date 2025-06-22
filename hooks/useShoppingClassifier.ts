// useShoppingClassifier.ts
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  MULTI_QA_MINILM_L6_COS_V1,
  MULTI_QA_MINILM_L6_COS_V1_TOKENIZER,
  useTextEmbeddings,
} from "react-native-executorch";
import { keywordCategorize } from "../utils/keywordCategorizer";
import { CATEGORIES, ItemCategory } from "../utils/shoppingCategories";
// Directly import the JSON data. Webpack/Metro will parse this for us.
import categoryVectors from "../assets/data/category_vectors.json";

const UNKNOWN_CATEGORY = CATEGORIES.find(
  (c: ItemCategory) => c.id === "unknown"
)!;

type CategoryVector = {
  [key: string]: number[];
};

// Function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct / (normA * normB);
}

type ClassificationResult = {
  primaryCategory: ItemCategory;
};

export function useShoppingClassifier() {
  const { forward, isReady } = useTextEmbeddings({
    modelSource: MULTI_QA_MINILM_L6_COS_V1,
    tokenizerSource: MULTI_QA_MINILM_L6_COS_V1_TOKENIZER,
  });

  // The `forward` function from the underlying hook might be unstable.
  // Store it in a ref to provide a stable reference to our callbacks.
  const forwardRef = useRef(forward);
  useEffect(() => {
    forwardRef.current = forward;
  }, [forward]);

  // We use a ref to track pending classifications that are waiting for the model.
  const pendingClassifications = useRef<
    Map<string, (result: ClassificationResult) => void>
  >(new Map());

  const classifyWithEmbeddings = useCallback(
    async (itemName: string): Promise<ClassificationResult> => {
      // Use the stable ref to the forward function.
      if (!forwardRef.current) {
        return {
          primaryCategory: UNKNOWN_CATEGORY,
        };
      }

      // 1. Create a question for the item
      const query = `Where would I find ${itemName}?`;

      // 2. Generate embedding for the query
      const queryVector = await forwardRef.current(query);

      // 3. Calculate cosine similarity against all category vectors
      const scores: { categoryId: string; score: number }[] = [];
      for (const [categoryId, vector] of Object.entries(
        categoryVectors as CategoryVector
      )) {
        const score = cosineSimilarity(queryVector, vector);
        scores.push({ categoryId, score });
      }

      // 4. Sort by score descending
      scores.sort((a, b) => b.score - a.score);

      // Optional: Filter out categories with very low scores
      const threshold = 0.3; // This may need tuning
      const matchedCategories = scores
        .filter((s) => s.score > threshold)
        .map(
          (s) => CATEGORIES.find((c: ItemCategory) => c.id === s.categoryId)!
        )
        .filter(Boolean);

      if (matchedCategories.length > 0) {
        return {
          primaryCategory: matchedCategories[0],
        };
      }

      // 5. If no matches, return unknown
      return {
        primaryCategory: UNKNOWN_CATEGORY,
      };
    },
    [] // This callback is now stable as it has no dependencies.
  );

  // When the model becomes ready, process any pending items.
  useEffect(() => {
    if (isReady && pendingClassifications.current.size > 0) {
      pendingClassifications.current.forEach(async (resolve, itemName) => {
        const result = await classifyWithEmbeddings(itemName);
        resolve(result);
      });
      pendingClassifications.current.clear();
    }
  }, [isReady, classifyWithEmbeddings]);

  const classify = useCallback(
    (
      itemName: string
    ): {
      syncResult: ClassificationResult;
      asyncResult?: Promise<ClassificationResult>;
    } => {
      // 1. First, try the fast keyword-based categorization.
      const keywordResult = keywordCategorize(itemName);

      // 2. If keyword fails, try the embedding model.
      if (isReady) {
        // Model is ready, we can classify immediately (but it's still async).
        return {
          syncResult: {
            primaryCategory: keywordResult.primaryCategory,
          },
          asyncResult: classifyWithEmbeddings(itemName),
        };
      }

      // 3. If model is not ready, return "unknown" synchronously and
      // set up a promise to resolve when it's ready.
      const asyncResult = new Promise<ClassificationResult>((resolve) => {
        pendingClassifications.current.set(itemName, resolve);
      });

      return {
        syncResult: keywordResult,
        asyncResult,
      };
    },
    [isReady, classifyWithEmbeddings] // classifyWithEmbeddings is stable now.
  );

  // Memoize the returned object so that the hook's return value is stable.
  return useMemo(() => ({ classify, ready: isReady }), [classify, isReady]);
}
