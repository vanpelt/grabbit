import { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { createContext, useContext } from "react";
import * as schema from "./schema";

export type DrizzleDb = ExpoSQLiteDatabase<typeof schema>;

export const DbContext = createContext<DrizzleDb | null>(null);

export const useDb = () => {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error("useDb must be used within a DbProvider");
  }
  return context;
};
