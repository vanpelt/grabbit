CREATE TABLE `shopping_list` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `name_idx` ON `shopping_list` (`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_locations` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lat` integer NOT NULL,
	`lng` integer NOT NULL,
	`type` text NOT NULL,
	`mapbox_id` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_locations`("id", "name", "lat", "lng", "type", "mapbox_id") SELECT "id", "name", "lat", "lng", "type", "mapbox_id" FROM `locations`;--> statement-breakpoint
DROP TABLE `locations`;--> statement-breakpoint
ALTER TABLE `__new_locations` RENAME TO `locations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `mapbox_id_index` ON `locations` (`mapbox_id`);