import { IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  productId!: string;
}
