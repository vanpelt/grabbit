import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const shoppingItems = sqliteTable("shopping_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const locations = sqliteTable(
  "locations",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    lat: integer("lat").notNull(),
    lng: integer("lng").notNull(),
    type: text("type").notNull(),
    mapboxId: text("mapbox_id").notNull(),
  },
  (table) => [uniqueIndex("mapbox_id_index").on(table.mapboxId)]
);
