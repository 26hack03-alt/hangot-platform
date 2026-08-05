import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  authUserId: text("auth_user_id").notNull().unique(),
  alias: text("alias").notNull().unique(),
  recoveryHash: text("recovery_hash").notNull().unique(),
  role: text("role", { enum: ["student", "club_manager", "admin"] }).notNull().default("student"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }).notNull(),
  ...timestamps,
});

export const clubs = sqliteTable("clubs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  field: text("field"),
  clubType: text("club_type"),
  description: text("description").notNull(),
  activityDetails: text("activity_details").notNull(),
  teacherDisplayText: text("teacher_display_text"),
  contactLocation: text("contact_location"),
  activityLocation: text("activity_location"),
  capacity: integer("capacity").notNull().default(20),
  recruitmentStatus: text("recruitment_status").notNull().default("open"),
  applicationStartAt: integer("application_start_at", { mode: "timestamp" }),
  applicationEndAt: integer("application_end_at", { mode: "timestamp" }),
  managerUserId: text("manager_user_id").references(() => users.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const teacherClubs = sqliteTable("teacher_clubs", {
  id: text("id").primaryKey(),
  teacherUserId: text("teacher_user_id").notNull().references(() => users.id),
  clubId: text("club_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
}, (table) => [uniqueIndex("teacher_clubs_teacher_club_unique").on(table.teacherUserId, table.clubId)]);

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  publicId: text("application_number").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id),
  clubId: text("club_id").notNull(),
  status: text("status", { enum: ["submitted", "under_review", "waiting", "approved", "rejected", "cancelled"] }).notNull().default("submitted"),
  motivation: text("motivation").notNull(),
  interestArea: text("interest_area"),
  careerInterest: text("career_interest").notNull(),
  experience: text("experience").notNull(),
  additionalAnswer: text("additional_answer"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).notNull(),
  cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewComment: text("review_comment"),
  googleSheetSynced: integer("google_sheet_synced", { mode: "boolean" }).notNull().default(false),
  googleSheetSyncedAt: integer("google_sheet_synced_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("application_user_club_unique").on(table.userId, table.clubId)]);

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  authorAlias: text("author_alias").notNull(),
  category: text("category").notNull(),
  clubId: text("club_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isNotice: integer("is_notice", { mode: "boolean" }).notNull().default(false),
  isHidden: integer("is_hidden", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  ...timestamps,
});

export const postComments = sqliteTable("post_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  authorAlias: text("author_alias").notNull(),
  content: text("content").notNull(),
  isHidden: integer("is_hidden", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  ...timestamps,
});

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  authorAlias: text("author_alias").notNull(),
  clubId: text("club_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["waiting", "answered", "closed"] }).notNull().default("waiting"),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  ...timestamps,
});

export const answers = sqliteTable("answers", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  authorRole: text("author_role").notNull(),
  content: text("content").notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  ...timestamps,
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").references(() => users.id),
  actorRole: text("actor_role").notNull(),
  actionType: text("action_type").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  beforeData: text("before_data"),
  afterData: text("after_data"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const syncJobs = sqliteTable("sync_jobs", {
  id: text("id").primaryKey(),
  dataType: text("data_type").notNull(),
  sourceId: text("source_id").notNull(),
  operation: text("operation").notNull(),
  payload: text("payload").notNull(),
  status: text("status").notNull().default("pending"),
  retryCount: integer("retry_count").notNull().default(0),
  lastError: text("last_error"),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  ...timestamps,
}, (table) => [uniqueIndex("sync_source_operation_unique").on(table.dataType, table.sourceId, table.operation)]);
