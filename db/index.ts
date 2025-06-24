import { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { createContext, useContext } from "react";
import * as schema from "./schema";

import { type TestDB } from "../__mocks__/testDb";

export type DrizzleDb = ExpoSQLiteDatabase<typeof schema> | TestDB;

export const DbContext = createContext<DrizzleDb | null>(null);

export const useDb = () => {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error("useDb must be used within a DbProvider");
  }
  return context;
};
