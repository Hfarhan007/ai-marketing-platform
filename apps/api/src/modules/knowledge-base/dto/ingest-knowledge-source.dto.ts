import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class IngestKnowledgeSourceDto {
  @IsString() @MaxLength(200) name!: string;
  @IsIn(['uploaded_document', 'website', 'faq', 'manual_text', 'crm_record', 'catalog', 'file', 'url', 'text']) sourceType!: string;
  @IsString() @MaxLength(2000) sourceReference!: string;
  @IsString() @MaxLength(200) idempotencyKey!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) collectionIds?: string[];
}
