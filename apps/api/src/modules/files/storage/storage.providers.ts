import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { StorageObjectMetadata, StorageProvider } from '../types/storage-provider.js';
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  constructor(config: ConfigService) {
    const provider = config.get<string>('storage.provider'),
      bucket = config.get<string>('storage.bucket');
    if ((provider === 's3' || provider === 'r2') && !bucket)
      throw new Error('STORAGE_BUCKET is required');
    this.bucket = bucket ?? '';
    const endpoint = config.get<string>('storage.endpoint');
    const accessKeyId = config.get<string>('storage.accessKeyId');
    const secretAccessKey = config.get<string>('storage.secretAccessKey');
    const options: S3ClientConfig = {
      region: config.get<string>('storage.region') ?? 'auto',
      forcePathStyle: provider === 'r2',
      ...(endpoint ? { endpoint } : {}),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    };
    this.client = new S3Client(options);
  }
  async presignUpload(key: string, contentType: string, size: number, expiresSeconds: number) {
    const expiresAt = new Date(Date.now() + expiresSeconds * 1000),
      url = await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: contentType,
          ContentLength: size,
        }),
        { expiresIn: expiresSeconds },
      );
    return { url, method: 'PUT' as const, headers: { 'content-type': contentType }, expiresAt };
  }
  presignDownload(key: string, expiresSeconds: number) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresSeconds,
    });
  }
  async head(key: string) {
    try {
      const v = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        size: v.ContentLength ?? 0,
        ...(v.ContentType ? { contentType: v.ContentType } : {}),
        ...(v.ChecksumSHA256 ? { checksum: v.ChecksumSHA256 } : {}),
      };
    } catch {
      return null;
    }
  }
  async read(key: string, maxBytes = 10_485_760) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key })),
      bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error('Storage object body unavailable');
    if (bytes.byteLength > maxBytes) throw new Error('Storage object exceeds processing limit');
    return Buffer.from(bytes);
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;
  private readonly publicUrl: string;
  private readonly signingSecret: string;
  constructor(config: ConfigService) {
    this.root = resolve(config.getOrThrow<string>('storage.localPath'));
    this.publicUrl = config.getOrThrow<string>('storage.publicUrl').replace(/\/$/u, '');
    this.signingSecret = config.getOrThrow<string>('auth.accessTokenSecret');
  }
  presignUpload(key: string, contentType: string, size: number, expiresSeconds: number) {
    const expiresAt = new Date(Date.now() + expiresSeconds * 1000),
      token = this.token({
        key,
        contentType,
        size,
        exp: Math.floor(expiresAt.valueOf() / 1000),
        op: 'upload',
      });
    return Promise.resolve({
      url: `${this.publicUrl}/local-upload/${token}`,
      method: 'PUT' as const,
      headers: { 'content-type': contentType },
      expiresAt,
    });
  }
  presignDownload(key: string, expiresSeconds: number) {
    const exp = Math.floor(Date.now() / 1000) + expiresSeconds,
      token = this.token({ key, exp, op: 'download' });
    return Promise.resolve(`${this.publicUrl}/local-download/${token}`);
  }
  async put(token: string, body: Buffer, contentType?: string) {
    const claim = this.verify(token, 'upload');
    if (
      typeof claim.size !== 'number' ||
      claim.size !== body.byteLength ||
      claim.contentType !== contentType
    )
      throw new UnauthorizedException('Upload metadata mismatch');
    const path = this.path(String(claim.key));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body, { flag: 'wx' });
  }
  async download(token: string) {
    const claim = this.verify(token, 'download');
    return this.read(String(claim.key));
  }
  async head(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const value = await stat(this.path(key));
      return { size: value.size };
    } catch {
      return null;
    }
  }
  async read(key: string, maxBytes = 10_485_760) {
    const value = await readFile(this.path(key));
    if (value.byteLength > maxBytes) throw new Error('Storage object exceeds processing limit');
    return value;
  }
  async delete(key: string) {
    try {
      await unlink(this.path(key));
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  private path(key: string) {
    if (key.includes('..') || key.includes('\\') || key.startsWith('/'))
      throw new UnauthorizedException('Invalid storage key');
    const path = resolve(this.root, key);
    if (!path.startsWith(`${this.root}${sep}`))
      throw new UnauthorizedException('Storage path escaped root');
    return path;
  }
  private token(claim: Record<string, unknown>) {
    const payload = Buffer.from(JSON.stringify(claim)).toString('base64url'),
      signature = createHmac('sha256', this.signingSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }
  private verify(token: string, op: string) {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) throw new UnauthorizedException('Invalid storage token');
    const expected = createHmac('sha256', this.signingSecret).update(payload).digest('base64url'),
      a = Buffer.from(signature),
      b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new UnauthorizedException('Invalid storage token');
    const claim = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<
      string,
      unknown
    >;
    if (claim.op !== op || typeof claim.exp !== 'number' || claim.exp < Date.now() / 1000)
      throw new UnauthorizedException('Expired storage token');
    return claim;
  }
}
@Injectable()
export class StorageProviderRegistry {
  constructor(
    private readonly config: ConfigService,
    private readonly local: LocalStorageProvider,
    private readonly s3: S3StorageProvider,
  ) {}
  get(): StorageProvider {
    const provider = this.config.get<string>('storage.provider');
    if (provider === 'local') return this.local;
    if (provider === 's3' || provider === 'r2') return this.s3;
    throw new ServiceUnavailableException('Storage provider is not configured');
  }
}
