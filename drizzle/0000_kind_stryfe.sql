CREATE TABLE `locations` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lat` integer NOT NULL,
	`lng` integer NOT NULL,
	`type` text NOT NULL,
	`mapbox_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mapbox_id_index` ON `locations` (`mapbox_id`);--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
