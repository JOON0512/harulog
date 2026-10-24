CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_a` text NOT NULL,
	`user_b` text NOT NULL,
	`requested_by` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_a`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_b`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_friendships_pair` ON `friendships` (`user_a`,`user_b`);--> statement-breakpoint
CREATE INDEX `idx_friendships_a_status` ON `friendships` (`user_a`,`status`);--> statement-breakpoint
CREATE INDEX `idx_friendships_b_status` ON `friendships` (`user_b`,`status`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`friend_code` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_friend_code` ON `profiles` (`friend_code`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`task_date` text NOT NULL,
	`category` text DEFAULT 'focus' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_owner_date` ON `tasks` (`owner_id`,`task_date`);