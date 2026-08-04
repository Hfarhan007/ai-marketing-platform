import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

export const CHUNKING_STRATEGIES = [
  'fixed-token',
  'paragraph',
  'heading-aware',
  'sentence-aware',
  'table-aware',
  'faq-pair',
  'transcript-segment',
  'sliding-window',
  'semantic-boundary',
] as const;
export type ChunkingStrategy = (typeof CHUNKING_STRATEGIES)[number];

export interface ChunkingPolicy {
  strategy: ChunkingStrategy;
  targetTokens: number;
  maxTokens: number;
  overlapTokens: number;
  contextTokens: number;
  createParentChunks: boolean;
  createSummaryChunks: boolean;
  nearDuplicateThreshold: number;
}

export interface ChunkingInput {
  content: string;
  workspaceId: string;
  sourceId: string;
  documentId: string;
  revisionId: string;
  language: string;
  sourceType?: string;
  accessControl?: Record<string, unknown>;
  policy?: Partial<ChunkingPolicy>;
}

export interface SemanticChunk {
  ordinal: number;
  text: string;
  hash: string;
  workspaceId: string;
  sourceId: string;
  documentId: string;
  revisionId: string;
  pageNumber: number | null;
  sectionHierarchy: string[];
  heading: string | null;
  precedingContext: string;
  followingContext: string;
  language: string;
  tokenCount: number;
  contentHash: string;
  chunkingVersion: string;
  accessControl: Record<string, unknown>;
  boundaryReason: string;
  chunkType: 'content' | 'parent' | 'summary';
  parentId: string | null;
  childIds: string[];
  nearDuplicateOf: string | null;
}

interface Block {
  text: string;
  kind: 'heading' | 'paragraph' | 'table' | 'faq' | 'transcript';
  page: number | null;
  hierarchy: string[];
  heading: string | null;
  reason: string;
}

export const hashContent = (value: string) => createHash('sha256').update(value).digest('hex');

const SOURCE_DEFAULTS: Record<string, Partial<ChunkingPolicy>> = {
  faq: { strategy: 'faq-pair', targetTokens: 180, maxTokens: 400 },
  website: { strategy: 'heading-aware', targetTokens: 320, maxTokens: 600 },
  url: { strategy: 'heading-aware', targetTokens: 320, maxTokens: 600 },
  catalog: { strategy: 'table-aware', targetTokens: 400, maxTokens: 800 },
  crm_record: { strategy: 'paragraph', targetTokens: 220, maxTokens: 450 },
  transcript: { strategy: 'transcript-segment', targetTokens: 300, maxTokens: 600 },
};

@Injectable()
export class ChunkingService {
  readonly version = 'semantic-v2';

  normalize(value: string) {
    return value
      .normalize('NFKC')
      .replace(/\r\n?/gu, '\n')
      .replace(/[^\S\n\f]+/gu, ' ')
      .replace(/\n{3,}/gu, '\n\n')
      .trim();
  }

  /** Backwards-compatible fixed-token entry point. */
  chunk(value: string, size = 220, overlap = 30) {
    const policy = this.policy(undefined, {
      strategy: overlap ? 'sliding-window' : 'fixed-token',
      targetTokens: size,
      maxTokens: size,
      overlapTokens: overlap,
    });
    this.validate(policy);
    return this.fixed(this.normalize(value), policy).map((part, ordinal) => ({
      ordinal,
      text: part.text,
      hash: hashContent(part.text),
    }));
  }

  chunkDocument(input: ChunkingInput): SemanticChunk[] {
    const content = this.removeBoilerplate(this.normalize(input.content));
    const policy = this.policy(input.sourceType, input.policy);
    this.validate(policy);
    const blocks = this.blocks(content, policy.strategy);
    const parts = this.pack(blocks, policy);
    const unique = this.markDuplicates(parts, policy.nearDuplicateThreshold);
    const contentChunks = unique.map((part, ordinal) =>
      this.toChunk(input, policy, part, ordinal, unique),
    );
    return this.addDerivedChunks(contentChunks, input, policy);
  }

  private policy(sourceType?: string, override: Partial<ChunkingPolicy> = {}): ChunkingPolicy {
    return {
      strategy: 'sentence-aware',
      targetTokens: 320,
      maxTokens: 520,
      overlapTokens: 40,
      contextTokens: 40,
      createParentChunks: false,
      createSummaryChunks: false,
      nearDuplicateThreshold: 0.88,
      ...(sourceType ? SOURCE_DEFAULTS[sourceType] : {}),
      ...override,
    };
  }

  private validate(policy: ChunkingPolicy) {
    if (
      policy.targetTokens < 20 ||
      policy.maxTokens < policy.targetTokens ||
      policy.overlapTokens < 0 ||
      policy.overlapTokens >= policy.targetTokens ||
      policy.contextTokens < 0 ||
      policy.nearDuplicateThreshold < 0 ||
      policy.nearDuplicateThreshold > 1
    )
      throw new Error('Invalid chunking policy');
  }

  private tokenCount(text: string) {
    // Deterministic tokenizer approximation that works for whitespace and CJK text.
    return (text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? []).length;
  }

  private sentences(text: string) {
    return (
      text
        .match(/[^.!?。！？\n]+(?:[.!?。！？]+|$)/gu)
        ?.map((value) => value.trim())
        .filter(Boolean) ?? []
    );
  }

  private removeBoilerplate(content: string) {
    const sections = content.split(/\n?\f\n?|\n-{3,}\s*page\s+\d+\s*-{3,}\n/iu);
    if (sections.length < 2) return content;
    const lines = sections.map((section) => section.split('\n').map((line) => line.trim()));
    const frequency = new Map<string, number>();
    for (const page of lines)
      for (const line of new Set(page.filter((value) => value.length >= 3 && value.length <= 160)))
        frequency.set(line.toLocaleLowerCase(), (frequency.get(line.toLocaleLowerCase()) ?? 0) + 1);
    const repeated = new Set(
      [...frequency].filter(([, count]) => count / sections.length >= 0.6).map(([line]) => line),
    );
    return lines
      .map((page) => page.filter((line) => !repeated.has(line.toLocaleLowerCase())).join('\n'))
      .join('\n\f\n');
  }

  private blocks(content: string, strategy: ChunkingStrategy): Block[] {
    if (strategy === 'fixed-token' || strategy === 'sliding-window')
      return [
        {
          text: content,
          kind: 'paragraph',
          page: 1,
          hierarchy: [],
          heading: null,
          reason: strategy,
        },
      ];
    const raw = content.split('\n');
    const result: Block[] = [];
    const hierarchy: string[] = [];
    let page = 1;
    for (let index = 0; index < raw.length;) {
      const line = raw[index]!.trim();
      if (line === '\f') {
        page++;
        index++;
        continue;
      }
      const heading = /^(#{1,6})\s+(.+)$/u.exec(line);
      if (heading) {
        const level = heading[1]!.length;
        hierarchy.splice(level - 1, hierarchy.length, heading[2]!);
        result.push({
          text: line,
          kind: 'heading',
          page,
          hierarchy: [...hierarchy],
          heading: heading[2]!,
          reason: 'heading transition',
        });
        index++;
        continue;
      }
      if (this.isTableLine(line)) {
        const table: string[] = [];
        while (index < raw.length && this.isTableLine(raw[index]!.trim()))
          table.push(raw[index++]!.trim());
        result.push({
          text: table.join('\n'),
          kind: 'table',
          page,
          hierarchy: [...hierarchy],
          heading: hierarchy.at(-1) ?? null,
          reason: 'complete table',
        });
        continue;
      }
      const question = /^(?:q(?:uestion)?\s*[:.-]|faq\s*[:.-]|[^.!?]{3,}\?)\s*(.*)$/iu.exec(line);
      if (question && strategy === 'faq-pair') {
        const pair = [line];
        index++;
        while (
          index < raw.length &&
          raw[index]!.trim() &&
          !/^(?:q(?:uestion)?\s*[:.-]|[^.!?]{3,}\?)/iu.test(raw[index]!.trim())
        )
          pair.push(raw[index++]!.trim());
        result.push({
          text: pair.join('\n'),
          kind: 'faq',
          page,
          hierarchy: [...hierarchy],
          heading: hierarchy.at(-1) ?? null,
          reason: 'FAQ question-answer pair',
        });
        continue;
      }
      if (
        /^(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?|[\p{L}][\p{L} .'-]{1,40}:)\s*/u.test(line) &&
        strategy === 'transcript-segment'
      ) {
        result.push({
          text: line,
          kind: 'transcript',
          page,
          hierarchy: [...hierarchy],
          heading: hierarchy.at(-1) ?? null,
          reason: 'speaker/timestamp transition',
        });
        index++;
        continue;
      }
      const paragraph: string[] = [];
      while (
        index < raw.length &&
        raw[index]!.trim() &&
        !/^(#{1,6})\s+/u.test(raw[index]!.trim()) &&
        !this.isTableLine(raw[index]!.trim())
      )
        paragraph.push(raw[index++]!.trim());
      if (paragraph.length)
        result.push({
          text: paragraph.join(' '),
          kind: 'paragraph',
          page,
          hierarchy: [...hierarchy],
          heading: hierarchy.at(-1) ?? null,
          reason:
            strategy === 'semantic-boundary' ? 'topic/paragraph transition' : 'paragraph boundary',
        });
      else index++;
    }
    return result;
  }

  private isTableLine(line: string) {
    return /^\|.*\|$/u.test(line) || /\S+\t+\S+/u.test(line);
  }

  private fixed(text: string, policy: ChunkingPolicy) {
    const tokens = text.split(/\s+/u).filter(Boolean);
    const result: Array<Block & { nearDuplicateOf?: number }> = [];
    const step =
      policy.strategy === 'sliding-window'
        ? policy.targetTokens - policy.overlapTokens
        : policy.targetTokens;
    for (let start = 0; start < tokens.length; start += step) {
      const value = tokens.slice(start, start + policy.maxTokens).join(' ');
      if (value)
        result.push({
          text: value,
          kind: 'paragraph',
          page: 1,
          hierarchy: [],
          heading: null,
          reason:
            policy.strategy === 'sliding-window'
              ? 'configured token window with overlap'
              : 'configured token limit',
        });
      if (start + policy.maxTokens >= tokens.length) break;
    }
    return result;
  }

  private pack(
    blocks: Block[],
    policy: ChunkingPolicy,
  ): Array<Block & { nearDuplicateOf?: number }> {
    if (policy.strategy === 'fixed-token' || policy.strategy === 'sliding-window')
      return this.fixed(blocks[0]?.text ?? '', policy);
    if (policy.strategy === 'paragraph') return blocks;
    const output: Block[] = [];
    for (const block of blocks) {
      if (block.kind === 'table' || block.kind === 'faq') {
        output.push(block); // Logical units may exceed the preferred maximum.
        continue;
      }
      const units = block.kind === 'heading' ? [block.text] : this.sentences(block.text);
      for (const unit of units.length ? units : [block.text]) {
        const last = output.at(-1);
        const compatible =
          last &&
          last.page === block.page &&
          last.heading === block.heading &&
          last.kind !== 'table' &&
          last.kind !== 'faq';
        if (compatible && this.tokenCount(`${last.text} ${unit}`) <= policy.targetTokens)
          last.text += ` ${unit}`;
        else
          output.push({
            ...block,
            text: unit,
            reason: output.length ? block.reason : 'document start',
          });
      }
    }
    return output;
  }

  private fingerprint(text: string) {
    return new Set(text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  }

  private similarity(left: string, right: string) {
    const a = this.fingerprint(left),
      b = this.fingerprint(right);
    const intersection = [...a].filter((token) => b.has(token)).length;
    const union = new Set([...a, ...b]).size;
    return union ? intersection / union : 0;
  }

  private markDuplicates(parts: Block[], threshold: number) {
    return parts.map((part, index) => {
      const duplicate = parts.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex < index && this.similarity(part.text, candidate.text) >= threshold,
      );
      return { ...part, ...(duplicate >= 0 ? { nearDuplicateOf: duplicate } : {}) };
    });
  }

  private context(text: string, count: number, fromEnd: boolean) {
    const words = text.split(/\s+/u).filter(Boolean);
    return (fromEnd ? words.slice(-count) : words.slice(0, count)).join(' ');
  }

  private toChunk(
    input: ChunkingInput,
    policy: ChunkingPolicy,
    part: Block & { nearDuplicateOf?: number },
    ordinal: number,
    all: Block[],
  ): SemanticChunk {
    const hash = hashContent(part.text);
    return {
      ordinal,
      text: part.text,
      hash,
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      documentId: input.documentId,
      revisionId: input.revisionId,
      pageNumber: part.page,
      sectionHierarchy: part.hierarchy,
      heading: part.heading,
      precedingContext: ordinal
        ? this.context(all[ordinal - 1]!.text, policy.contextTokens, true)
        : '',
      followingContext:
        ordinal + 1 < all.length
          ? this.context(all[ordinal + 1]!.text, policy.contextTokens, false)
          : '',
      language: input.language,
      tokenCount: this.tokenCount(part.text),
      contentHash: hash,
      chunkingVersion: this.version,
      accessControl: { ...(input.accessControl ?? {}) },
      boundaryReason: part.reason,
      chunkType: 'content',
      parentId: null,
      childIds: [],
      nearDuplicateOf: part.nearDuplicateOf === undefined ? null : `chunk:${part.nearDuplicateOf}`,
    };
  }

  private addDerivedChunks(chunks: SemanticChunk[], input: ChunkingInput, policy: ChunkingPolicy) {
    if (!policy.createParentChunks && !policy.createSummaryChunks) return chunks;
    const derived: SemanticChunk[] = [];
    const groups = new Map<string, SemanticChunk[]>();
    for (const chunk of chunks) {
      const key = `${chunk.pageNumber}:${chunk.sectionHierarchy.join('>')}`;
      groups.set(key, [...(groups.get(key) ?? []), chunk]);
    }
    for (const children of groups.values()) {
      if (policy.createParentChunks && children.length > 1) {
        const ordinal = chunks.length + derived.length;
        const parent = this.derived(
          input,
          children.map((child) => child.text).join('\n\n'),
          ordinal,
          'parent',
          children,
          'section aggregation',
        );
        for (const child of children) child.parentId = parent.hash;
        derived.push(parent);
      }
      if (policy.createSummaryChunks) {
        const text = children
          .map((child) => this.sentences(child.text)[0] ?? child.text)
          .join(' ')
          .slice(0, 2000);
        derived.push(
          this.derived(
            input,
            text,
            chunks.length + derived.length,
            'summary',
            children,
            'extractive section summary',
          ),
        );
      }
    }
    return [...chunks, ...derived];
  }

  private derived(
    input: ChunkingInput,
    text: string,
    ordinal: number,
    type: 'parent' | 'summary',
    children: SemanticChunk[],
    reason: string,
  ): SemanticChunk {
    const hash = hashContent(text);
    return {
      ...children[0]!,
      ordinal,
      text,
      hash,
      contentHash: hash,
      tokenCount: this.tokenCount(text),
      precedingContext: '',
      followingContext: '',
      chunkType: type,
      parentId: null,
      childIds: children.map((child) => child.hash),
      nearDuplicateOf: null,
      boundaryReason: reason,
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      documentId: input.documentId,
      revisionId: input.revisionId,
    };
  }
}
