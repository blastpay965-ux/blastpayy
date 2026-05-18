import { pgTable, uuid, text, numeric, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

// ── profiles ──────────────────────────────────────────────────────
// Mirrors auth.users, extends with casino-specific fields.
export const profiles = pgTable('profiles', {
  id:            uuid('id').primaryKey(),           // matches auth.users.id
  username:      text('username').unique().notNull(),
  accountNumber: text('account_number').unique().notNull(),
  isGuest:       boolean('is_guest').default(false).notNull(),
  contact:       text('contact').default(''),
  balance:       numeric('balance', { precision: 15, scale: 2 }).default('0.00').notNull(),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── transactions ──────────────────────────────────────────────────
export const transactions = pgTable('transactions', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId:    uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type:      text('type').notNull(),        // 'deposit' | 'withdrawal'
  amount:    numeric('amount', { precision: 15, scale: 2 }).notNull(),
  currency:  text('currency').default('NGN').notNull(),
  status:    text('status').default('successful').notNull(),
  reference: text('reference'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── admin_config ──────────────────────────────────────────────────
// Singleton row (id = 1). All game house settings + moderation lists.
export const adminConfig = pgTable('admin_config', {
  id:                   integer('id').primaryKey().default(1),
  crashHouseEdge:       numeric('crash_house_edge', { precision: 5, scale: 2 }).default('5').notNull(),
  crashMaxMultiplier:   numeric('crash_max_multiplier', { precision: 10, scale: 2 }).default('100').notNull(),
  minesHouseEdge:       numeric('mines_house_edge', { precision: 5, scale: 2 }).default('5').notNull(),
  isRigged:             boolean('is_rigged').default(false).notNull(),
  nextCrashMultiplier:  numeric('next_crash_multiplier', { precision: 10, scale: 2 }),
  minesRiggedNextClick: text('mines_rigged_next_click'),   // 'bomb' | 'gem' | null
  plinkoHouseEdge:      numeric('plinko_house_edge').default('5'),
  plinkoRiggedBucket:   text('plinko_rigged_bucket'),
  globalRigOutcome:     text('global_rig_outcome'),        // 'win' | 'lose' | null
  sandboxPaymentMode:   boolean('sandbox_payment_mode').default(true).notNull(),
  bannedUsers:          text('banned_users').array().default([]).notNull(),
  frozenUsers:          text('frozen_users').array().default([]).notNull(),
  totalDeposits:        numeric('total_deposits', { precision: 15, scale: 2 }).default('254000').notNull(),
  totalWithdrawals:     numeric('total_withdrawals', { precision: 15, scale: 2 }).default('112000').notNull(),
  activeUsersCount:     integer('active_users_count').default(148).notNull(),
  simulatedGrowth:      numeric('simulated_growth', { precision: 8, scale: 2 }).default('15.4').notNull(),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── game_rounds ───────────────────────────────────────────────────
export const gameRounds = pgTable('game_rounds', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  gameType:     text('game_type').notNull(), // 'crash', 'mines', 'plinko'
  serverSeed:   text('server_seed').notNull(),
  clientSeed:   text('client_seed'),
  finalOutcome: text('final_outcome'), // JSON string of the result
  status:       text('status').default('active').notNull(), // 'active', 'completed'
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
  completedAt:  timestamp('completed_at', { withTimezone: true }),
});

// ── bets ──────────────────────────────────────────────────────────
export const bets = pgTable('bets', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId:       uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  gameRoundId:  uuid('game_round_id').references(() => gameRounds.id, { onDelete: 'set null' }),
  gameType:     text('game_type').notNull(),
  betAmount:    numeric('bet_amount', { precision: 15, scale: 2 }).notNull(),
  multiplier:   numeric('multiplier', { precision: 10, scale: 2 }), // Cashed out multiplier
  payoutAmount: numeric('payout_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Type exports
export type Profile     = typeof profiles.$inferSelect;
export type NewProfile  = typeof profiles.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type AdminConfig = typeof adminConfig.$inferSelect;
export type GameRound   = typeof gameRounds.$inferSelect;
export type Bet         = typeof bets.$inferSelect;

// sql helper needed for default uuid
import { sql } from 'drizzle-orm';
