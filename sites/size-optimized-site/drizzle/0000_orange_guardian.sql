CREATE TABLE `consents` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`version` text NOT NULL,
	`upload_hash` text NOT NULL,
	`granted_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consents_upload_hash_unique` ON `consents` (`upload_hash`);--> statement-breakpoint
CREATE INDEX `consents_visitor` ON `consents` (`visitor_id`);--> statement-breakpoint
CREATE TABLE `deletions` (
	`scope` text NOT NULL,
	`subject_hash` text NOT NULL,
	`deleted_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `subject_hash`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`visitor_id` text NOT NULL,
	`event_id` text NOT NULL,
	`session_id` text NOT NULL,
	`consent_id` text NOT NULL,
	`kind` text NOT NULL,
	`at` integer NOT NULL,
	`received_at` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`visitor_id`, `event_id`),
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_time_kind` ON `events` (`at`,`kind`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_hash` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`contact` text NOT NULL,
	`summary` text,
	`created_at` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`privacy_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen` integer NOT NULL
);
