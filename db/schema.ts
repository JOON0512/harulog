import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  nickname: text('nickname').notNull().default(''),
  friendCode: text('friend_code').notNull(),
  createdAt: integer('created_at').notNull(),
}, t => [uniqueIndex('idx_profiles_friend_code').on(t.friendCode)]);

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => profiles.id, {onDelete:'cascade'}),
  title: text('title').notNull(),
  taskDate: text('task_date').notNull(),
  category: text('category', {enum:['focus','life','other']}).notNull().default('focus'),
  visibility: text('visibility', {enum:['private','friends']}).notNull().default('private'),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, t => [index('idx_tasks_owner_date').on(t.ownerId,t.taskDate)]);

export const friendships = sqliteTable('friendships', {
  id: text('id').primaryKey(),
  userA: text('user_a').notNull().references(() => profiles.id, {onDelete:'cascade'}),
  userB: text('user_b').notNull().references(() => profiles.id, {onDelete:'cascade'}),
  requestedBy: text('requested_by').notNull().references(() => profiles.id, {onDelete:'cascade'}),
  status: text('status', {enum:['pending','accepted']}).notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
}, t => [uniqueIndex('idx_friendships_pair').on(t.userA,t.userB), index('idx_friendships_a_status').on(t.userA,t.status), index('idx_friendships_b_status').on(t.userB,t.status)]);
