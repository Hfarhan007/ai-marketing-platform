import { IsIn, IsString, MaxLength } from 'class-validator';
export class IngestKnowledgeSourceDto {
  @IsString() @MaxLength(200) name!: string;
  @IsIn(['file', 'url', 'text']) sourceType!: string;
  @IsString() @MaxLength(2000) sourceReference!: string;
  @IsString() @MaxLength(200) idempotencyKey!: string;
}
