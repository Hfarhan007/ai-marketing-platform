import { SetMetadata } from '@nestjs/common';
import { REQUIRE_WORKSPACE_KEY } from '../constants/tenant.constants.js';

export const RequireWorkspace = () => SetMetadata(REQUIRE_WORKSPACE_KEY, true);
