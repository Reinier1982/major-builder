CREATE TABLE `obstacles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`order` integer,
	`created_at` integer,
	`updated_at` integer
);
