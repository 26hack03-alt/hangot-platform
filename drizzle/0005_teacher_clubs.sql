CREATE TABLE `teacher_clubs` (
  `id` text PRIMARY KEY NOT NULL,
  `teacher_user_id` text NOT NULL,
  `club_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `created_by` text NOT NULL,
  FOREIGN KEY (`teacher_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_clubs_teacher_club_unique` ON `teacher_clubs` (`teacher_user_id`,`club_id`);
