import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDetail {
  @ApiProperty()
  code!: string;
  @ApiProperty()
  message!: string;
  @ApiProperty({ required: false })
  details?: unknown;
}

export class ApiErrorResponse {
  @ApiProperty()
  statusCode!: number;
  @ApiProperty()
  requestId!: string;
  @ApiProperty()
  timestamp!: string;
  @ApiProperty()
  path!: string;
  @ApiProperty({ type: ApiErrorDetail })
  error!: ApiErrorDetail;
}
