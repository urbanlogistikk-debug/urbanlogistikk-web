CREATE TABLE `daily_page_views` (
	`key` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`path` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pageviews_day_idx` ON `daily_page_views` (`day`);--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`reference` text NOT NULL,
	`payload_hash` text NOT NULL,
	`kind` text NOT NULL,
	`source_label` text NOT NULL,
	`search_text` text NOT NULL,
	`data_json` text NOT NULL,
	`status` text DEFAULT 'ny' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`follow_up_date` text DEFAULT '' NOT NULL,
	`costing_json` text,
	`created_day` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inquiries_request_key_unique` ON `inquiries` (`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `inquiries_reference_unique` ON `inquiries` (`reference`);--> statement-breakpoint
CREATE INDEX `inquiries_status_created_idx` ON `inquiries` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_created_day_idx` ON `inquiries` (`created_day`);--> statement-breakpoint
CREATE TABLE `inquiry_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`inquiry_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`changed_fields` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_expiry_idx` ON `rate_limits` (`expires_at`);