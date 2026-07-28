import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { FilePolicyService } from './file-policy.service.js';

describe('FilePolicyService', () => {
  const policy = new FilePolicyService();

  it('accepts a matching safe file name and MIME type', () => {
    const result = policy.validateName('campaign-image.png');
    expect(result).toEqual({ clean: 'campaign-image.png', extension: '.png' });
    expect(() => policy.validateDeclared(result.extension, 'image/png')).not.toThrow();
  });

  it.each(['../secret.png', 'folder/secret.png', String.raw`folder\secret.png`, 'payload.exe'])(
    'rejects unsafe or executable name %s',
    (name) => {
      expect(() => policy.validateName(name)).toThrow(BadRequestException);
    },
  );

  it('rejects a browser-declared MIME that does not match the extension', () => {
    expect(() => policy.validateDeclared('.png', 'text/javascript')).toThrow(BadRequestException);
  });
});
