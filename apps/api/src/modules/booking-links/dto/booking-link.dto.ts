import { IsArray, IsBoolean, IsInt, IsMongoId, IsObject, IsOptional, IsString, Matches, Min } from 'class-validator';
export class CreateBookingLinkDto {
 @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!:string;
 @IsArray() @IsMongoId({each:true}) serviceIds!:string[];
 @IsOptional() @IsObject() staffRules:Record<string,unknown>={}; @IsOptional() @IsMongoId() availabilityId?:string;
 @IsOptional() @IsObject() branding:Record<string,string>={}; @IsOptional() @IsArray() @IsObject({each:true}) customQuestions:Record<string,string|boolean>[]=[];
 @IsOptional() @IsObject() confirmationSettings:Record<string,string|boolean>={}; @IsOptional() @IsBoolean() active=true;
}
export class UpdateBookingLinkDto extends CreateBookingLinkDto { @IsInt() @Min(0) version!:number; }
