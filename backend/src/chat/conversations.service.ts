import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types';
import { DRIZZLE, type Database } from '../db/drizzle.module';
import { conversations, messages, products } from '../db/schema';

/**
 * All reads/writes for support threads. Authorization rules:
 *   • a customer may only touch conversations they own;
 *   • an agent may touch every conversation.
 */
@Injectable()
export class ConversationsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Lists conversations for the caller. Agents see every thread (10 customers ×
   * 2 products => 20 threads); customers see only their own. Each entry carries
   * the product, the customer, and the most recent message for preview.
   */
  async listForUser(user: AuthUser) {
    const rows = await this.db.query.conversations.findMany({
      where:
        user.role === 'customer'
          ? eq(conversations.customerId, user.sub)
          : undefined,
      orderBy: [desc(conversations.lastMessageAt)],
      with: {
        product: true,
        customer: {
          columns: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: [desc(messages.createdAt)],
          limit: 1,
        },
      },
    });

    return rows.map((row) => this.toSummary(row));
  }

  /**
   * Returns the customer's conversation for a product, creating it on first
   * contact. The unique(productId, customerId) constraint keeps this to exactly
   * one thread per pair even under concurrent requests.
   */
  async getOrCreateForCustomer(customerId: string, productId: string) {
    const product = await this.db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const existing = await this.db.query.conversations.findFirst({
      where: and(
        eq(conversations.customerId, customerId),
        eq(conversations.productId, productId),
      ),
    });
    if (existing) {
      return this.getByIdRaw(existing.id);
    }

    // onConflictDoNothing handles the race where two requests create at once.
    await this.db
      .insert(conversations)
      .values({ customerId, productId })
      .onConflictDoNothing();

    const created = await this.db.query.conversations.findFirst({
      where: and(
        eq(conversations.customerId, customerId),
        eq(conversations.productId, productId),
      ),
    });
    return this.getByIdRaw(created!.id);
  }

  /** Fetches a single conversation, enforcing access rules. */
  async getByIdForUser(id: string, user: AuthUser) {
    const conversation = await this.getByIdRaw(id);
    this.assertAccess(conversation, user);
    return conversation;
  }

  /** Ordered message history for a conversation (oldest first). */
  async getMessages(conversationId: string, user: AuthUser) {
    const conversation = await this.getByIdRaw(conversationId);
    this.assertAccess(conversation, user);

    const rows = await this.db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [asc(messages.createdAt)],
      with: {
        sender: { columns: { id: true, name: true } },
      },
    });
    return rows;
  }

  /**
   * Persists a message, bumps the conversation's activity timestamp, and returns
   * the stored row (with sender info) so callers can broadcast it verbatim.
   */
  async createMessage(
    conversationId: string,
    sender: AuthUser,
    content: string,
  ) {
    const conversation = await this.getByIdRaw(conversationId);
    this.assertAccess(conversation, sender);

    const [message] = await this.db
      .insert(messages)
      .values({
        conversationId,
        senderId: sender.sub,
        senderRole: sender.role,
        content,
      })
      .returning();

    await this.db
      .update(conversations)
      .set({ lastMessageAt: message.createdAt })
      .where(eq(conversations.id, conversationId));

    return {
      ...message,
      sender: { id: sender.sub, name: sender.name },
    };
  }

  /** Public summary lookup used by the gateway to broadcast list updates. */
  getSummary(id: string) {
    return this.getByIdRaw(id);
  }

  // --- internal helpers ---

  private async getByIdRaw(id: string) {
    const conversation = await this.db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: {
        product: true,
        customer: { columns: { id: true, name: true, email: true } },
        messages: { orderBy: [desc(messages.createdAt)], limit: 1 },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }
    return this.toSummary(conversation);
  }

  private assertAccess(conversation: { customerId: string }, user: AuthUser) {
    if (user.role === 'agent') return;
    if (conversation.customerId !== user.sub) {
      throw new ForbiddenException(
        'You do not have access to this conversation.',
      );
    }
  }

  /** Normalises a relational row into the shape the frontend consumes. */
  private toSummary(row: {
    id: string;
    productId: string;
    customerId: string;
    createdAt: Date;
    lastMessageAt: Date;
    product: typeof products.$inferSelect;
    customer: { id: string; name: string; email: string };
    messages: Array<{
      id: string;
      content: string;
      senderRole: 'customer' | 'agent';
      createdAt: Date;
    }>;
  }) {
    const lastMessage = row.messages[0] ?? null;
    return {
      id: row.id,
      productId: row.productId,
      customerId: row.customerId,
      createdAt: row.createdAt,
      lastMessageAt: row.lastMessageAt,
      product: row.product,
      customer: row.customer,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderRole: lastMessage.senderRole,
            createdAt: lastMessage.createdAt,
          }
        : null,
    };
  }
}
