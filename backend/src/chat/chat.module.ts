import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, ChatGateway],
})
export class ChatModule {}
