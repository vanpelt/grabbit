// useShoppingClassifier.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { Asset } from "expo-asset";
import tokenizerJson from "../assets/models/tokenizer.json";
const MODEL_ASSET = require("../assets/models/multi-qa-MiniLM-L6-cos-v1.onnx");
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

const vocab = (tokenizerJson as any).model.vocab as Record<string, number>;
const MAX_LENGTH = (tokenizerJson as any).truncation?.max_length ?? 250;
const PAD_ID = vocab["[PAD]"];
const CLS_ID = vocab["[CLS]"];
const SEP_ID = vocab["[SEP]"];
const UNK_ID = vocab["[UNK]"];

function wordpieceTokenize(word: string): number[] {
  const tokens: number[] = [];
  let start = 0;
  while (start < word.length) {
    let end = word.length;
    let curr: number | null = null;
    while (start < end) {
      let substr = word.slice(start, end);
      if (start > 0) substr = "##" + substr;
      if (vocab[substr] !== undefined) {
        curr = vocab[substr];
        break;
      }
      end -= 1;
    }
    if (curr === null) {
      tokens.push(UNK_ID);
      break;
    } else {
      tokens.push(curr);
      start = end;
    }
  }
  return tokens;
}

function encode(text: string) {
  const words = text.toLowerCase().trim().split(/\s+/g);
  let ids: number[] = [CLS_ID];
  for (const w of words) ids.push(...wordpieceTokenize(w));
  ids.push(SEP_ID);
  ids = ids.slice(0, MAX_LENGTH);
  const attention = new Array(ids.length).fill(1);
  while (ids.length < MAX_LENGTH) {
    ids.push(PAD_ID);
    attention.push(0);
  }
  const typeIds = new Array(MAX_LENGTH).fill(0);
  return { inputIds: ids, attentionMask: attention, tokenTypeIds: typeIds };
}

function useOnnxEmbeddings() {
  const [session, setSession] = useState<InferenceSession | null>(null);

  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(MODEL_ASSET);
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;
      const s = await InferenceSession.create(uri);
      setSession(s);
    })();
  }, []);

  const forward = useCallback(
    async (text: string): Promise<number[]> => {
      if (!session) {
        return [];
      }
      const { inputIds, attentionMask, tokenTypeIds } = encode(text);
      const toBigInt64 = (arr: number[]) =>
        BigInt64Array.from(arr.map((v) => BigInt(v)));
      const feeds = {
        input_ids: new Tensor("int64", toBigInt64(inputIds), [1, MAX_LENGTH]),
        attention_mask: new Tensor(
          "int64",
          toBigInt64(attentionMask),
          [1, MAX_LENGTH]
        ),
        token_type_ids: new Tensor(
          "int64",
          toBigInt64(tokenTypeIds),
          [1, MAX_LENGTH]
        ),
      } as const;
      const output = await session.run(feeds);
      const embedding = output.sentence_embedding.data as Float32Array;
      return Array.from(embedding);
    },
    [session]
  );

  return { forward, isReady: !!session } as const;
}

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
  const { forward, isReady } = useOnnxEmbeddings();

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
