// useShoppingClassifier.ts
import { logger } from "@/utils/logger";
import { Asset } from "expo-asset";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import tokenizerJson from "../assets/models/tokenizer-int8.json";
import { keywordCategorize } from "../utils/keywordCategorizer";
import { CATEGORIES, ItemCategory } from "../utils/shoppingCategories";
const MODEL_ASSET = require("../assets/models/model_qint8_arm64.onnx");
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

// Function to perform mean pooling on last_hidden_state
function meanPooling(
  lastHiddenState: Float32Array,
  attentionMask: number[],
  sequenceLength: number,
  hiddenSize: number
): number[] {
  const sentenceEmbedding = new Float32Array(hiddenSize);

  for (let dim = 0; dim < hiddenSize; dim++) {
    let sum = 0;
    let count = 0;

    for (let seq = 0; seq < sequenceLength; seq++) {
      // Only include tokens that are not padding (attention_mask == 1)
      if (attentionMask[seq] === 1) {
        const index = seq * hiddenSize + dim;
        sum += lastHiddenState[index];
        count++;
      }
    }

    sentenceEmbedding[dim] = count > 0 ? sum / count : 0;
  }

  return Array.from(sentenceEmbedding);
}

function useOnnxEmbeddings() {
  const loadingRef = useRef(false);
  const sessionRef = useRef<InferenceSession | null>(null);
  const [session, setSession] = useState<InferenceSession | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Check if we already have a session
        if (sessionRef.current) {
          logger.log("Model already loaded, using existing session");
          setSession(sessionRef.current);
          return;
        }

        // Check if loading is already in progress
        if (loadingRef.current) {
          logger.log("Model already loading, skipping");
          return;
        }

        loadingRef.current = true;
        logger.log("Starting model loading...");

        const asset = Asset.fromModule(MODEL_ASSET);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const s = await InferenceSession.create(uri);

        // Store the session in both ref and state
        sessionRef.current = s;
        setSession(s);

        logger.log("Model loaded successfully");
      } catch (e) {
        logger.error("Error creating ONNX session", e);
        // Reset loading flag on error so we can retry
        loadingRef.current = false;
      }
    })();

    // Cleanup function
    return () => {
      // Don't reset loadingRef here - we want to keep track of loading state
      // even across component unmounts/remounts
    };
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
        attention_mask: new Tensor("int64", toBigInt64(attentionMask), [
          1,
          MAX_LENGTH,
        ]),
        token_type_ids: new Tensor("int64", toBigInt64(tokenTypeIds), [
          1,
          MAX_LENGTH,
        ]),
      } as const;
      try {
        const output = await session.run(feeds);

        // First, try to get sentence_embedding directly
        const sentenceEmbedding = output.sentence_embedding?.data as
          | Float32Array
          | undefined;

        if (sentenceEmbedding) {
          return Array.from(sentenceEmbedding);
        }

        // Fallback: check for last_hidden_state and perform pooling
        const lastHiddenState = output.last_hidden_state?.data as
          | Float32Array
          | undefined;
        if (!lastHiddenState) {
          logger.error(
            "No sentence_embedding or last_hidden_state found in output"
          );
          return [];
        }

        // Perform mean pooling over the sequence length
        // last_hidden_state shape: [1, sequence_length, hidden_size]
        const sequenceLength = MAX_LENGTH;
        const hiddenSize = lastHiddenState.length / (1 * sequenceLength);

        return meanPooling(
          lastHiddenState,
          attentionMask,
          sequenceLength,
          hiddenSize
        );
      } catch (e) {
        logger.error("Error running ONNX forward pass", e);
        return [];
      }
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
        logger.warn("No forward function available");
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

      logger.log(
        `❓ Query: ${itemName}, (${matchedCategories.length} categories, best score ${scores[0].score})`
      );

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
      logger.log(
        `Processing ${pendingClassifications.current.size} pending classifications...`
      );
      pendingClassifications.current.forEach(async (resolve, itemName) => {
        const result = await classifyWithEmbeddings(itemName);
        resolve(result);
      });
      pendingClassifications.current.clear();
    }
    logger.log("Model not ready...");
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
      logger.log("Model not ready, queueing classification for", itemName);

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
