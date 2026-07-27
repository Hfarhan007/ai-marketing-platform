import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { UpdateWorkspaceSettingsDto } from './update-workspace-settings.dto.js';

describe('UpdateWorkspaceSettingsDto', () => {
  it('rejects a request-body workspaceId override', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    await expect(
      pipe.transform(
        { workspaceId: '507f1f77bcf86cd799439012', weekStartsOn: 1 },
        { type: 'body', metatype: UpdateWorkspaceSettingsDto },
      ),
    ).rejects.toThrow();
  });
});
