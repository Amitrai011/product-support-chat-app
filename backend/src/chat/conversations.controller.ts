import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  /** List threads visible to the caller (all for agents, own for customers). */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.conversations.listForUser(user);
  }

  /** Customer opens (or resumes) a support thread for a product. */
  @Post()
  @Roles('customer')
  open(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.conversations.getOrCreateForCustomer(user.sub, dto.productId);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversations.getByIdForUser(id, user);
  }

  @Get(':id/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversations.getMessages(id, user);
  }
}
