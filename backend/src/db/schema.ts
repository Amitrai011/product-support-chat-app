import { relations } from 'drizzle-orm';
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Two roles in the system. A user is either a customer (opens support chats)
 * or an agent (answers every customer's chats).
 */
export const userRole = pgEnum('user_role', ['customer', 'agent']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRole('role').notNull().default('customer'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  tagline: text('tagline'),
  description: text('description').notNull(),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('USD'),
  imageUrl: text('image_url'),
  category: text('category'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A conversation is a single support thread: one customer talking about one
 * product. The unique(productId, customerId) constraint guarantees exactly one
 * thread per (customer, product) pair — so a customer chatting about two
 * products gets two independent conversations, and 10 customers × 2 products
 * yields 20 threads the agent can manage.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Bumped on every new message so lists can sort by most-recent activity.
    lastMessageAt: timestamp('last_message_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('conversations_product_customer_unique').on(
      t.productId,
      t.customerId,
    ),
  ],
);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  senderRole: userRole('sender_role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Relations (used by Drizzle's relational query API) ---

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  messages: many(messages),
}));

export const productsRelations = relations(products, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    product: one(products, {
      fields: [conversations.productId],
      references: [products.id],
    }),
    customer: one(users, {
      fields: [conversations.customerId],
      references: [users.id],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
