import { parentPort } from 'node:worker_threads';
import { SecureTextExtractor } from './secure-text-extractor.js';
import type { ExtractionLimits } from './text-extraction.types.js';
interface Request { content: Uint8Array; extension: string; mimeType: string; limits: ExtractionLimits }
parentPort?.on('message', (request: Request) => { try { parentPort?.postMessage({ ok: true, result: new SecureTextExtractor().extract(Buffer.from(request.content), request.extension, request.mimeType, request.limits) }); } catch (error) { parentPort?.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Extraction failed' }); } });
