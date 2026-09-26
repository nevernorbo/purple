CREATE TABLE `card_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`title` text NOT NULL,
	`prompt` text NOT NULL,
	`restored_from` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_revisions_card_idx` ON `card_revisions` (`card_id`,`id`);