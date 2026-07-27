import { SetMetadata } from '@nestjs/common';
import { REQUIRE_CSRF_KEY } from '../constants/auth.constants.js';
export const RequireCsrf = () => SetMetadata(REQUIRE_CSRF_KEY, true);
