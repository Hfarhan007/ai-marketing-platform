export interface FileValidationOptions {
  allowedMimeTypes?: readonly string[];
  maxBytes?: number;
  minBytes?: number;
}

export interface FileValidationResult {
  errors: readonly string[];
  valid: boolean;
}
