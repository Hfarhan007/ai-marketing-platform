export function parseStructuredJson(content: string): unknown {
  if (content.length > 32_768) throw new Error('Structured response exceeds repair limit');
  try { return JSON.parse(content) as unknown; } catch {
    let repaired = content.trim(), repairs = 0;
    if (/^```(?:json)?\s[\s\S]*\s```$/iu.test(repaired)) { repaired = repaired.replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, ''); repairs += 1; }
    const withoutTrailingCommas = repaired.replace(/,\s*([}\]])/gu, '$1');
    if (withoutTrailingCommas !== repaired) { repaired = withoutTrailingCommas; repairs += 1; }
    if (!repairs || repairs > 2) throw new Error('Structured response is not repairable');
    return JSON.parse(repaired) as unknown;
  }
}
