import { SetMetadata } from '@nestjs/common';
import { PLATFORM_ADMIN_OPERATION_KEY } from '../constants/tenant.constants.js';

export const PlatformAdminOperation = () => SetMetadata(PLATFORM_ADMIN_OPERATION_KEY, true);
