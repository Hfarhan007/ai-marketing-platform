export interface ExtractedBlock { text: string; pageNumber?: number; sectionPath: string[]; sourceStart?: number; sourceEnd?: number; kind: 'paragraph' | 'heading' | 'table' | 'metadata' }
export interface TextExtractionResult { mimeType: string; extension: string; contentHash: string; text: string; blocks: ExtractedBlock[]; metadata: Record<string, unknown>; language: string; toolVersion: string; quality: 'high' | 'medium' | 'low'; warnings: string[] }
export interface ExtractionLimits { maxFileBytes: number; maxExpandedBytes: number; maxCompressionRatio: number; maxEntries: number }
