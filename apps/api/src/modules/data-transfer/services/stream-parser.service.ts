import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Readable } from 'node:stream';
export interface ParsedRow {
  rowNumber: number;
  values: Record<string, unknown>;
}
@Injectable()
export class StreamParserService {
  async *parse(format: 'csv' | 'xlsx' | 'json', stream: Readable): AsyncGenerator<ParsedRow> {
    if (format === 'csv') yield* this.csv(stream);
    else if (format === 'xlsx') yield* this.xlsx(stream);
    else yield* this.json(stream);
  }
  private async *csv(stream: Readable): AsyncGenerator<ParsedRow> {
    let headers: string[] | null = null,
      row: string[] = [],
      field = '',
      quoted = false,
      rowNumber = 0;
    const emit = () => {
      row.push(field);
      field = '';
      rowNumber += 1;
      const current = row;
      row = [];
      if (!headers) {
        headers = current.map((value) => value.trim());
        this.validateHeaders(headers);
        return null;
      }
      return {
        rowNumber,
        values: Object.fromEntries(headers.map((header, index) => [header, current[index] ?? ''])),
      };
    };
    for await (const chunk of stream) {
      const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      for (let index = 0; index < text.length; index += 1) {
        const character = text[index]!;
        if (character === '"') {
          if (quoted && text[index + 1] === '"') {
            field += '"';
            index += 1;
          } else quoted = !quoted;
        } else if (character === ',' && !quoted) {
          row.push(field);
          field = '';
        } else if ((character === '\n' || character === '\r') && !quoted) {
          if (character === '\r' && text[index + 1] === '\n') index += 1;
          if (field || row.length) {
            const value = emit();
            if (value) yield value;
          }
        } else field += character;
      }
    }
    if (quoted) throw new BadRequestException('IMPORT_CSV_UNCLOSED_QUOTE');
    if (field || row.length) {
      const value = emit();
      if (value) yield value;
    }
    if (!headers) throw new BadRequestException('IMPORT_FILE_EMPTY');
  }
  private async *xlsx(stream: Readable): AsyncGenerator<ParsedRow> {
    const workbook = new ExcelJS.stream.xlsx.WorkbookReader(stream, {});
    let headers: string[] | null = null,
      rowNumber = 0;
    for await (const worksheet of workbook) {
      for await (const row of worksheet) {
        rowNumber += 1;
        const values = (row.values as unknown[]).slice(1).map((value) => this.cell(value));
        if (!headers) {
          headers = values.map(String);
          this.validateHeaders(headers);
          continue;
        }
        yield {
          rowNumber,
          values: Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
        };
      }
      break;
    }
    if (!headers) throw new BadRequestException('IMPORT_FILE_EMPTY');
  }
  private async *json(stream: Readable): AsyncGenerator<ParsedRow> {
    let buffer = '',
      rowNumber = 0;
    for await (const chunk of stream) {
      buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      if (buffer.length > 2_000_000) throw new BadRequestException('IMPORT_JSON_ROW_TOO_LARGE');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line || line === '[' || line === ']') continue;
        const cleaned = line.endsWith(',') ? line.slice(0, -1) : line;
        rowNumber += 1;
        yield { rowNumber, values: this.jsonObject(cleaned) };
      }
    }
    const tail = buffer.trim();
    if (tail && tail !== ']' && tail !== '[') {
      rowNumber += 1;
      yield { rowNumber, values: this.jsonObject(tail.endsWith(',') ? tail.slice(0, -1) : tail) };
    }
    if (!rowNumber) throw new BadRequestException('IMPORT_FILE_EMPTY');
  }
  private jsonObject(value: string) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      return parsed as Record<string, unknown>;
    } catch {
      throw new BadRequestException('IMPORT_JSON_MALFORMED');
    }
  }
  private validateHeaders(headers: string[]) {
    if (
      !headers.length ||
      headers.length > 250 ||
      headers.some((header) => !header || header.length > 120) ||
      new Set(headers).size !== headers.length
    )
      throw new BadRequestException('IMPORT_HEADERS_INVALID');
  }
  private cell(value: unknown): unknown {
    if (
      value instanceof Date ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'string'
    )
      return value;
    if (value && typeof value === 'object' && 'text' in value) {
      const text = value.text;
      return typeof text === 'string' || typeof text === 'number' ? String(text) : '';
    }
    if (value && typeof value === 'object' && 'result' in value) return value.result;
    return '';
  }
}
