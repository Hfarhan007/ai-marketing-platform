export interface StorageObjectMetadata {
  size: number;
  contentType?: string;
  checksum?: string;
}
export interface PresignedUpload {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: Date;
}
export interface StorageProvider {
  presignUpload(
    key: string,
    contentType: string,
    size: number,
    expiresSeconds: number,
  ): Promise<PresignedUpload>;
  presignDownload(key: string, expiresSeconds: number): Promise<string>;
  head(key: string): Promise<StorageObjectMetadata | null>;
  read(key: string, maxBytes?: number): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
