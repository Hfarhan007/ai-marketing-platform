import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import type {
  ExtractedBlock,
  ExtractionLimits,
  TextExtractionResult,
} from './text-extraction.types.js';
export const EXTRACTION_TOOL_VERSION = 'secure-text-extractor/1.0.0';
const OFFICE = new Set(['.docx', '.pptx', '.xlsx']);
export class SecureTextExtractor {
  extract(
    content: Buffer,
    extension: string,
    mimeType: string,
    limits: ExtractionLimits,
  ): TextExtractionResult {
    if (!content.length || content.length > limits.maxFileBytes)
      throw new BadRequestException('Extraction file-size limit exceeded');
    const normalizedExtension = extension.toLowerCase(),
      warnings: string[] = [];
    let blocks: ExtractedBlock[],
      metadata: Record<string, unknown> = {};
    if (OFFICE.has(normalizedExtension))
      ({ blocks, metadata } = this.office(content, normalizedExtension, limits));
    else if (normalizedExtension === '.pdf') ({ blocks, metadata } = this.pdf(content, warnings));
    else if (['.html', '.htm'].includes(normalizedExtension))
      blocks = this.html(this.decode(content, warnings));
    else if (normalizedExtension === '.json') blocks = this.json(this.decode(content, warnings));
    else if (normalizedExtension === '.eml')
      ({ blocks, metadata } = this.email(this.decode(content, warnings)));
    else if (['.txt', '.md', '.markdown', '.csv'].includes(normalizedExtension))
      blocks = this.plain(this.decode(content, warnings), normalizedExtension);
    else throw new BadRequestException('Text extraction is not supported for this file type');
    blocks = this.cleanup(blocks, warnings);
    const text = blocks
      .map((block) => block.text)
      .filter(Boolean)
      .join('\n\n')
      .normalize('NFC');
    if (!text.trim()) warnings.push('no_extractable_text');
    return {
      mimeType,
      extension: normalizedExtension,
      contentHash: createHash('sha256').update(text).digest('hex'),
      text,
      blocks,
      metadata,
      language: this.language(text),
      toolVersion: EXTRACTION_TOOL_VERSION,
      quality: text.length > 100 && !warnings.length ? 'high' : text.length ? 'medium' : 'low',
      warnings: [...new Set(warnings)],
    };
  }
  private office(content: Buffer, extension: string, limits: ExtractionLimits) {
    const entries = this.zip(content, limits);
    if (
      [...entries.keys()].some((name) =>
        /(?:vbaProject\.bin|macrosheets|embeddings\/|activeX\/|\.exe$|\.js$)/iu.test(name),
      )
    )
      throw new BadRequestException('Macros or embedded executable content are prohibited');
    const xml = (name: string) => this.xmlText(entries.get(name)?.toString('utf8') ?? '');
    const blocks: ExtractedBlock[] = [];
    if (extension === '.docx')
      for (const [name, value] of entries)
        if (/^word\/(?:document|header\d+|footer\d+)\.xml$/u.test(name)) {
          if (/header|footer/u.test(name)) continue;
          blocks.push(...this.xmlBlocks(value.toString('utf8'), ['Document']));
        }
    if (extension === '.pptx')
      for (const [name, value] of [...entries].sort())
        if (/^ppt\/slides\/slide\d+\.xml$/u.test(name)) {
          const page = Number(name.match(/\d+/u)?.[0] ?? 1);
          blocks.push(...this.xmlBlocks(value.toString('utf8'), [`Slide ${page}`], page));
        }
    if (extension === '.xlsx') {
      const shared = this.sharedStrings(
        entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '',
      );
      for (const [name, value] of [...entries].sort())
        if (/^xl\/worksheets\/sheet\d+\.xml$/u.test(name))
          blocks.push({
            text: this.sheet(value.toString('utf8'), shared),
            sectionPath: [name.split('/').at(-1) ?? name],
            kind: 'table',
          });
    }
    return { blocks, metadata: { title: xml('docProps/core.xml'), entryCount: entries.size } };
  }
  private zip(content: Buffer, limits: ExtractionLimits) {
    const entries = new Map<string, Buffer>();
    let offset = 0,
      expanded = 0;
    while (offset + 30 <= content.length && content.readUInt32LE(offset) === 0x04034b50) {
      if (entries.size >= limits.maxEntries)
        throw new BadRequestException('Archive entry limit exceeded');
      const flags = content.readUInt16LE(offset + 6),
        method = content.readUInt16LE(offset + 8),
        compressed = content.readUInt32LE(offset + 18),
        uncompressed = content.readUInt32LE(offset + 22),
        nameLength = content.readUInt16LE(offset + 26),
        extraLength = content.readUInt16LE(offset + 28);
      if (flags & 1 || flags & 8)
        throw new BadRequestException('Encrypted or streaming archives are prohibited');
      const nameStart = offset + 30,
        name = content.toString('utf8', nameStart, nameStart + nameLength);
      if (!name || name.includes('..') || name.startsWith('/') || name.includes('\\'))
        throw new BadRequestException('Unsafe archive path');
      if (
        uncompressed > limits.maxExpandedBytes ||
        (compressed === 0
          ? uncompressed > 0
          : uncompressed / compressed > limits.maxCompressionRatio)
      )
        throw new BadRequestException('Archive bomb detected');
      const start = nameStart + nameLength + extraLength,
        packed = content.subarray(start, start + compressed);
      let value: Buffer;
      if (method === 0) value = Buffer.from(packed);
      else if (method === 8)
        value = inflateRawSync(packed, { maxOutputLength: limits.maxExpandedBytes - expanded });
      else throw new BadRequestException('Unsupported archive compression');
      expanded += value.length;
      if (expanded > limits.maxExpandedBytes)
        throw new BadRequestException('Archive expanded-size limit exceeded');
      if (!name.endsWith('/')) entries.set(name, value);
      offset = start + compressed;
    }
    if (!entries.size) throw new BadRequestException('Invalid or empty Office archive');
    return entries;
  }
  private pdf(content: Buffer, warnings: string[]) {
    if (!content.subarray(0, 5).equals(Buffer.from('%PDF-')))
      throw new BadRequestException('Invalid PDF signature');
    if (/\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction)\b/u.test(content.toString('latin1')))
      throw new BadRequestException('PDF embedded code or attachment is prohibited');
    const source = content.toString('latin1'),
      pages = source.split(/\/Type\s*\/Page\b/u).slice(1),
      blocks = pages.map((page, index) => ({
        text: [...page.matchAll(/\(([^()]*)\)\s*Tj/gu)]
          .map((match) => match[1]!.replace(/\\([()\\])/gu, '$1'))
          .join(' '),
        pageNumber: index + 1,
        sectionPath: [`Page ${index + 1}`],
        kind: 'paragraph' as const,
      }));
    warnings.push('pdf_layout_heuristic');
    return { blocks, metadata: { pageCount: pages.length } };
  }
  private html(value: string) {
    const cleaned = value
      .replace(
        /<(?:script|style|noscript|template)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template)>/giu,
        '',
      )
      .replace(/<(?:nav|footer|aside)\b[^>]*>[\s\S]*?<\/(?:nav|footer|aside)>/giu, '');
    const blocks: ExtractedBlock[] = [];
    for (const match of cleaned.matchAll(/<(h[1-6]|p|li|tr)\b[^>]*>([\s\S]*?)<\/\1>/giu)) {
      const text = this.entities(match[2]!.replace(/<[^>]+>/gu, ' '))
        .replace(/\s+/gu, ' ')
        .trim();
      if (text)
        blocks.push({
          text,
          sectionPath: [],
          sourceStart: match.index,
          sourceEnd: match.index + match[0].length,
          kind: match[1]!.startsWith('h') ? 'heading' : match[1] === 'tr' ? 'table' : 'paragraph',
        });
    }
    return blocks;
  }
  private json(value: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException('Invalid JSON document');
    }
    return [
      {
        text: JSON.stringify(parsed, null, 2),
        sectionPath: ['$'],
        sourceStart: 0,
        sourceEnd: value.length,
        kind: 'paragraph' as const,
      },
    ];
  }
  private email(value: string) {
    const split = value.search(/\r?\n\r?\n/u),
      headerText = split < 0 ? value : value.slice(0, split),
      body = split < 0 ? '' : value.slice(split).trim(),
      headers = Object.fromEntries(
        [...headerText.matchAll(/^([\w-]+):\s*(.+)$/gmu)].map((match) => [
          match[1]!.toLowerCase(),
          match[2]!,
        ]),
      );
    if (/content-type:\s*multipart\//iu.test(headerText))
      return { blocks: this.plain(body.replace(/^--.*$/gmu, ''), '.txt'), metadata: headers };
    return { blocks: this.plain(body, '.txt'), metadata: headers };
  }
  private plain(value: string, extension: string) {
    if (extension === '.csv')
      return value
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line) => ({
          text: line
            .split(',')
            .map((cell) => cell.trim())
            .join(' | '),
          sectionPath: ['Table'],
          sourceStart: value.indexOf(line),
          sourceEnd: value.indexOf(line) + line.length,
          kind: 'table' as const,
        }));
    const blocks: ExtractedBlock[] = [];
    let section: string[] = [];
    for (const match of value.matchAll(/^.*$/gmu)) {
      const text = match[0].trim();
      if (!text) continue;
      if (/^#{1,6}\s/u.test(text))
        section = [
          ...section.slice(0, (text.match(/^#+/u)?.[0].length ?? 1) - 1),
          text.replace(/^#+\s*/u, ''),
        ];
      blocks.push({
        text,
        sectionPath: section,
        sourceStart: match.index,
        sourceEnd: match.index + match[0].length,
        kind: /^#/u.test(text) ? 'heading' : 'paragraph',
      });
    }
    return blocks;
  }
  private xmlBlocks(value: string, sectionPath: string[], pageNumber?: number) {
    return [...value.matchAll(/<(?:w:p|a:p)\b[^>]*>([\s\S]*?)<\/(?:w:p|a:p)>/gu)]
      .map((match) => ({
        text: this.xmlText(match[1]!),
        ...(pageNumber ? { pageNumber } : {}),
        sectionPath,
        sourceStart: match.index,
        sourceEnd: match.index + match[0].length,
        kind: 'paragraph' as const,
      }))
      .filter((block) => block.text);
  }
  private xmlText(value: string) {
    return this.entities(
      [...value.matchAll(/<(?:w:t|a:t|dc:title)\b[^>]*>([\s\S]*?)<\/(?:w:t|a:t|dc:title)>/gu)]
        .map((match) => match[1])
        .join(' '),
    ).trim();
  }
  private sharedStrings(value: string) {
    return [...value.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gu)].map((match) =>
      this.xmlText(match[1]!),
    );
  }
  private sheet(value: string, shared: string[]) {
    return [...value.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gu)]
      .map((row) =>
        [...row[1]!.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gu)]
          .map((cell) => {
            const raw = cell[2]!.match(/<v>([\s\S]*?)<\/v>/u)?.[1] ?? '';
            return /t="s"/u.test(cell[1]!) ? (shared[Number(raw)] ?? '') : raw;
          })
          .join(' | '),
      )
      .join('\n');
  }
  private cleanup(blocks: ExtractedBlock[], warnings: string[]) {
    const counts = new Map<string, number>();
    for (const block of blocks) counts.set(block.text, (counts.get(block.text) ?? 0) + 1);
    const threshold = Math.max(3, Math.ceil(blocks.length * 0.6)),
      cleaned = blocks.filter((block) => (counts.get(block.text) ?? 0) < threshold);
    if (cleaned.length !== blocks.length) warnings.push('repeated_header_footer_removed');
    return cleaned;
  }
  private decode(content: Buffer, warnings: string[]) {
    let value = content.toString('utf8');
    if (value.includes('\uFFFD')) {
      value = content.toString('latin1');
      warnings.push('encoding_fallback_latin1');
    }
    return value
      .replace(/^\uFEFF/u, '')
      .replace(/\r\n?/gu, '\n')
      .normalize('NFC');
  }
  private entities(value: string) {
    return value
      .replace(/&nbsp;/giu, ' ')
      .replace(/&amp;/giu, '&')
      .replace(/&lt;/giu, '<')
      .replace(/&gt;/giu, '>')
      .replace(/&quot;/giu, '"')
      .replace(/&#39;/giu, "'");
  }
  private language(value: string) {
    const points = [...value].map((character) => character.codePointAt(0) ?? 0);
    if (points.some((point) => point >= 0x0600 && point <= 0x06ff)) return 'ar';
    if (points.some((point) => point >= 0x0400 && point <= 0x04ff)) return 'ru';
    if (points.some((point) => point >= 0x4e00 && point <= 0x9fff)) return 'zh';
    if (/[؀-ۿ]/u.test(value)) return 'ar';
    if (/[Ѐ-ӿ]/u.test(value)) return 'ru';
    if (/[一-鿿]/u.test(value)) return 'zh';
    return 'en';
  }
}
