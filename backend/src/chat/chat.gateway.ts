import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { AuthUser, JwtPayload } from '../auth/auth.types';
import { ConversationsService } from './conversations.service';
import { SendMessageDto } from './dto/send-message.dto';

/** Room helpers keep room-name construction in one place. */
const rooms = {
  conversation: (id: string) => `conversation:${id}`,
  user: (id: string) => `user:${id}`,
  agents: 'agents',
};

/**
 * Real-time transport for the chat. Authentication happens once at connection
 * time via the JWT in the Socket.IO handshake; the decoded user is kept in a
 * per-socket map and reused (type-safely) for every subsequent event.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  /** Authenticated principal per connected socket. */
  private readonly principals = new WeakMap<Socket, AuthUser>();

  constructor(
    private readonly conversations: ConversationsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      this.principals.set(client, payload);

      // Personal room (so a user is reachable across all their threads) and,
      // for agents, the shared room that receives every conversation update.
      void client.join(rooms.user(payload.sub));
      if (payload.role === 'agent') {
        void client.join(rooms.agents);
      }
      this.logger.log(`Connected: ${payload.email} (${payload.role})`);
    } catch {
      this.logger.warn('Rejected socket connection: invalid token');
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.principals.get(client);
    if (user) this.logger.log(`Disconnected: ${user.email}`);
  }

  /** Subscribe to live messages for a single conversation (after auth check). */
  @SubscribeMessage('conversation:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = this.userOf(client);
    // Throws if the user may not access this conversation.
    await this.conversations.getByIdForUser(body.conversationId, user);
    await client.join(rooms.conversation(body.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('conversation:leave')
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    await client.leave(rooms.conversation(body.conversationId));
    return { ok: true };
  }

  /** Persist a message and fan it out in real time. */
  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ValidationPipe({ transform: true }))
    body: SendMessageDto,
  ) {
    const user = this.userOf(client);

    const message = await this.conversations.createMessage(
      body.conversationId,
      user,
      body.content.trim(),
    );
    const summary = await this.conversations.getSummary(body.conversationId);

    // 1) Everyone viewing the thread gets the new message.
    this.server
      .to(rooms.conversation(body.conversationId))
      .emit('message:new', message);

    // 2) Every agent + the owning customer get a list-level update so their
    //    conversation lists re-sort / show the new preview without a refetch.
    this.server
      .to(rooms.agents)
      .to(rooms.user(summary.customerId))
      .emit('conversation:updated', summary);

    return { ok: true, message };
  }

  /** Lightweight typing indicator, relayed only to others in the thread. */
  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; isTyping: boolean },
  ) {
    const user = this.userOf(client);
    client.to(rooms.conversation(body.conversationId)).emit('typing', {
      conversationId: body.conversationId,
      userId: user.sub,
      name: user.name,
      role: user.role,
      isTyping: body.isTyping,
    });
  }

  /** Resolves the authenticated principal for a socket, or rejects the event. */
  private userOf(client: Socket): AuthUser {
    const user = this.principals.get(client);
    if (!user) throw new WsException('Unauthenticated socket.');
    return user;
  }

  private extractToken(client: Socket): string {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    const fromHeader = client.handshake.headers.authorization?.replace(
      'Bearer ',
      '',
    );
    const token = fromAuth ?? fromHeader;
    if (!token) throw new WsException('Missing token');
    return token;
  }
}
