import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsMongoId, IsOptional, IsString, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { CHANNEL_TYPES } from '../schemas/inbox.schemas.js';
export class AttachmentDto {
  @IsString() @MaxLength(255) name!: string;
  @IsString() @MaxLength(150) contentType!: string;
  @IsInt() @Min(0) @Max(26_214_400) size!: number;
  @IsOptional() @IsUrl({ require_protocol: true }) url?: string;
  @IsOptional() @IsString() @MaxLength(128) storageKey?: string;
}
export class InboundMessageDto {
  @IsMongoId() workspaceId!: string;
  @IsMongoId() conversationId!: string;
  @IsMongoId() channelConnectionId!: string;
  @IsString() @MaxLength(500) providerMessageId!: string;
  @IsIn(CHANNEL_TYPES) channelType!: (typeof CHANNEL_TYPES)[number];
  @IsOptional() @IsMongoId() participantId?: string;
  @IsIn(['text', 'html', 'template']) contentType!: string;
  @IsString() @MaxLength(50_000) content!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AttachmentDto) attachments: AttachmentDto[] = [];
}
export class SendMessageDto {
  @IsString() @MaxLength(200) idempotencyKey!: string;
  @IsIn(['text', 'html', 'template']) contentType!: string;
  @IsString() @MaxLength(50_000) content!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AttachmentDto) attachments: AttachmentDto[] = [];
  @IsOptional() @IsBoolean() draft = false;
}
export class ConversationActionDto {
  @IsOptional() @Type(() => Date) snoozedUntil?: Date;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
export class AssignmentDto { @IsMongoId() userId!: string; }
export class LabelsDto { @IsArray() @IsMongoId({ each: true }) labelIds!: string[]; }
export class CursorQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}
export class DeliveryUpdateDto {
  @IsIn(['sending', 'sent', 'delivered', 'read', 'failed']) state!: string;
  @IsOptional() @IsString() @MaxLength(100) failureCode?: string;
}
