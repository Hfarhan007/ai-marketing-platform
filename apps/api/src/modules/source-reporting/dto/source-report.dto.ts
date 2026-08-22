import{Transform}from'class-transformer';import{IsArray,IsDateString,IsMongoId,IsOptional,IsString}from'class-validator';
const list=({value}:{value:unknown})=>Array.isArray(value)?value:typeof value==='string'?value.split(',').map((item)=>item.trim()).filter(Boolean):[];
export class SourceReportQueryDto{@IsDateString()since!:string;@IsDateString()until!:string;@IsOptional()@Transform(list)@IsArray()@IsString({each:true})sources:string[]=[];@IsOptional()@Transform(list)@IsArray()@IsMongoId({each:true})campaignIds:string[]=[]}

